import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Between, In, Repository } from 'typeorm';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { createHmac } from 'crypto';
import { TaskType, TestTask, TaskStatus } from './entities/test-task.entity';
import { TestScript, ScriptExecutionMode } from '../test-script/entities/test-script.entity';
import { Environment } from '../environment/entities/environment.entity';
import { ExecutionErrorType, ExecutionRunnerSource, ExecutionStatus, TestExecution } from './entities/test-execution.entity';
import { TaskCallback, TaskCallbackStatus } from './entities/task-callback.entity';
import { AlertNotification, AlertNotificationType } from './entities/alert-notification.entity';
import axios, { AxiosError } from 'axios';

export interface TestResult {
  scriptId: string;
  scriptName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  url?: string;
  method?: string;
  runnerSource?: ExecutionRunnerSource;
  requestHeaders?: Record<string, any>;
  requestBody?: any;
  error?: string;
  errorStack?: string;
  response?: any;
  executionMeta?: {
    httpAttempt?: number;
    maxAttempts?: number;
    retryCount?: number;
    fallbackUsed?: boolean;
    flowState?: string;
    lastHttpStatus?: number;
    lastHttpCode?: string;
    lastHttpReason?: string;
    retryPolicy?: string;
    retryEligible?: boolean;
  };
}

type ExecutionFlowState = 'pending' | 'running_http' | 'retry_waiting' | 'running_local_fallback' | 'finished';

@Injectable()
export class TestExecutionService {
  private readonly logger = new Logger(TestExecutionService.name);
  private readonly execFileAsync = promisify(execFile);

  constructor(
    @InjectRepository(TestTask)
    private taskRepository: Repository<TestTask>,
    @InjectRepository(TestScript)
    private scriptRepository: Repository<TestScript>,
    @InjectRepository(Environment)
    private environmentRepository: Repository<Environment>,
    @InjectRepository(TestExecution)
    private executionRepository: Repository<TestExecution>,
    @InjectRepository(TaskCallback)
    private callbackRepository: Repository<TaskCallback>,
    @InjectRepository(AlertNotification)
    private alertNotificationRepository: Repository<AlertNotification>,
    private configService: ConfigService,
  ) {}

  async executeTask(taskId: string, environment?: string, environmentId?: string): Promise<TestResult[]> {
    const task = await this.taskRepository.findOne({ 
      where: { id: taskId }
    });
    
    if (!task) {
      throw new Error('任务不存在');
    }

    const startAt = new Date();
    await this.taskRepository.update(taskId, {
      status: TaskStatus.RUNNING,
      startTime: startAt,
    });
    task.status = TaskStatus.RUNNING;
    task.startTime = startAt;

    if (task.type === TaskType.UI_TEST) {
      return [];
    }

    const results: TestResult[] = [];
    const batchNo = `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let finalStatus: TaskStatus = TaskStatus.COMPLETED;
    let taskError: string | undefined;
    
    try {
      const scripts = await this.getTaskScripts(task);
      const targetEnvironment = await this.resolveEnvironment(task, environment, environmentId);
      
      for (const script of scripts) {
        const result = await this.executeScript(script, task, targetEnvironment, batchNo);
        results.push(result);
      }

      const passedCount = results.filter(r => r.status === 'passed').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      const passRate = scripts.length > 0 ? (passedCount / scripts.length) * 100 : 0;

      finalStatus = failedCount > 0 ? TaskStatus.FAILED : TaskStatus.COMPLETED;
      const endAt = new Date();
      await this.taskRepository.update(taskId, {
        status: finalStatus,
        endTime: endAt,
        passedCases: passedCount,
        failedCases: failedCount,
        passRate: Math.round(passRate * 100) / 100,
        totalCases: scripts.length,
      });
      task.status = finalStatus;
      task.endTime = endAt;
      task.passedCases = passedCount;
      task.failedCases = failedCount;
      task.totalCases = scripts.length;
      task.passRate = Math.round(passRate * 100) / 100;

    } catch (error) {
      this.logger.error(`任务执行失败: ${error.message}`);
      finalStatus = TaskStatus.FAILED;
      taskError = error.message;
      const endAt = new Date();
      await this.taskRepository.update(taskId, {
        status: TaskStatus.FAILED,
        endTime: endAt,
      });
      task.status = TaskStatus.FAILED;
      task.endTime = endAt;
    } finally {
      await this.notifyTaskCallback(task, finalStatus, results, taskError, batchNo);
    }

    return results;
  }

  private async notifyTaskCallback(task: TestTask, finalStatus: TaskStatus, results: TestResult[], taskError?: string, batchNo?: string): Promise<void> {
    const triggerType = (task.triggerType || '').toLowerCase();
    const triggerUrl = task.triggerUrl;

    if (!triggerUrl || (triggerType && triggerType !== 'webhook')) {
      return;
    }

    const timeoutMs = Math.max(1000, this.configService.get<number>('taskCallback.timeoutMs') ?? 5000);
    const retryCount = Math.max(0, this.configService.get<number>('taskCallback.retryCount') ?? 2);
    const retryDelayMs = Math.max(200, this.configService.get<number>('taskCallback.retryDelayMs') ?? 1000);
    const callbackSecret = this.configService.get<string>('taskCallback.secret') || '';
    const signatureEnabled = Boolean(callbackSecret);
    const maxAttempts = retryCount + 1;

    const payload = {
      event: 'task.execution.completed',
      task: {
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        status: finalStatus,
        startTime: task.startTime,
        endTime: task.endTime,
        totalCases: task.totalCases || results.length,
        passedCases: task.passedCases || results.filter((item) => item.status === 'passed').length,
        failedCases: task.failedCases || results.filter((item) => item.status === 'failed').length,
        passRate: Number(task.passRate || 0),
      },
      error: taskError,
      results: results.map((item) => ({
        scriptId: item.scriptId,
        scriptName: item.scriptName,
        status: item.status,
        runnerSource: item.runnerSource,
        duration: item.duration,
        error: item.error,
      })),
      sentAt: new Date().toISOString(),
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const signatureHeaders = this.buildTaskCallbackSignatureHeaders(payload, callbackSecret);
        const callbackStartAt = Date.now();

        const response = await axios.post(triggerUrl, payload, {
          timeout: timeoutMs,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json',
            ...signatureHeaders,
          },
        });

        const durationMs = Date.now() - callbackStartAt;
        const statusCode = response.status;
        const isSuccess = statusCode >= 200 && statusCode < 300;

        if (isSuccess) {
          await this.saveTaskCallbackRecord({
            task,
            batchNo,
            payload,
            triggerType,
            triggerUrl,
            attempts: attempt,
            status: TaskCallbackStatus.SUCCESS,
            responseStatus: statusCode,
            durationMs,
            signatureEnabled,
          });
          this.logger.log(`任务回调成功: taskId=${task.id}, url=${triggerUrl}, attempt=${attempt}/${maxAttempts}`);
          return;
        }

        const httpError = `HTTP ${statusCode}`;
        if (attempt >= maxAttempts) {
          await this.saveTaskCallbackRecord({
            task,
            batchNo,
            payload,
            triggerType,
            triggerUrl,
            attempts: attempt,
            status: TaskCallbackStatus.FAILED,
            responseStatus: statusCode,
            durationMs,
            signatureEnabled,
            errorMessage: httpError,
          });
          this.logger.error(
            `任务回调失败（已重试结束）: taskId=${task.id}, url=${triggerUrl}, attempt=${attempt}/${maxAttempts}, error=${httpError}`,
          );
          return;
        }

        this.logger.warn(
          `任务回调失败，将重试: taskId=${task.id}, url=${triggerUrl}, attempt=${attempt}/${maxAttempts}, error=${httpError}`,
        );
        await this.sleep(retryDelayMs * attempt);
      } catch (error) {
        const detail = this.toLogPreview((error as Error)?.message || error);
        if (attempt >= maxAttempts) {
          await this.saveTaskCallbackRecord({
            task,
            batchNo,
            payload,
            triggerType,
            triggerUrl,
            attempts: attempt,
            status: TaskCallbackStatus.FAILED,
            durationMs: 0,
            signatureEnabled,
            errorMessage: detail,
          });
          this.logger.error(
            `任务回调失败（已重试结束）: taskId=${task.id}, url=${triggerUrl}, attempt=${attempt}/${maxAttempts}, error=${detail}`,
          );
          return;
        }

        this.logger.warn(
          `任务回调失败，将重试: taskId=${task.id}, url=${triggerUrl}, attempt=${attempt}/${maxAttempts}, error=${detail}`,
        );
        await this.sleep(retryDelayMs * attempt);
      }
    }
  }

  private async saveTaskCallbackRecord(params: {
    task: TestTask;
    batchNo?: string;
    payload: Record<string, any>;
    triggerType: string;
    triggerUrl: string;
    attempts: number;
    status: TaskCallbackStatus;
    responseStatus?: number;
    durationMs: number;
    signatureEnabled: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const record = this.callbackRepository.create({
      taskId: params.task.id,
      batchNo: params.batchNo,
      triggerType: params.triggerType || 'webhook',
      callbackUrl: params.triggerUrl,
      event: String(params.payload?.event || ''),
      status: params.status,
      attempts: params.attempts,
      responseStatus: params.responseStatus,
      durationMs: params.durationMs,
      signatureEnabled: params.signatureEnabled,
      errorMessage: params.errorMessage,
      requestBody: params.payload,
    });

    const saved = await this.callbackRepository.save(record);
    await this.evaluateAndCreateCallbackNotifications(params.task, saved);
  }

  private async evaluateAndCreateCallbackNotifications(task: TestTask, latestRecord: TaskCallback): Promise<void> {
    const threshold = Math.max(1, this.configService.get<number>('taskCallback.alertConsecutiveFailed') ?? 3);
    const latest = await this.callbackRepository.find({
      where: { taskId: task.id },
      order: { createdAt: 'DESC' },
      take: threshold + 2,
    });

    const currentFailed = this.countLeadingFailed(latest);
    const previousFailed = this.countLeadingFailed(latest.slice(1));
    const currentRisk = currentFailed >= threshold;
    const previousRisk = previousFailed >= threshold;

    if (!previousRisk && currentRisk) {
      await this.alertNotificationRepository.save(
        this.alertNotificationRepository.create({
          projectId: task.projectId,
          taskId: task.id,
          type: AlertNotificationType.CALLBACK_RISK,
          level: 'danger',
          title: '任务回调连续失败告警',
          content: `${task.name} 连续回调失败 ${currentFailed} 次（阈值 ${threshold}）`,
          payload: {
            taskId: task.id,
            taskName: task.name,
            projectId: task.projectId,
            consecutiveFailed: currentFailed,
            threshold,
            callbackId: latestRecord.id,
          },
          isRead: false,
        }),
      );
      return;
    }

    if (previousRisk && !currentRisk) {
      await this.alertNotificationRepository.save(
        this.alertNotificationRepository.create({
          projectId: task.projectId,
          taskId: task.id,
          type: AlertNotificationType.CALLBACK_RECOVERED,
          level: 'success',
          title: '任务回调告警恢复',
          content: `${task.name} 的回调状态已恢复正常`,
          payload: {
            taskId: task.id,
            taskName: task.name,
            projectId: task.projectId,
            callbackId: latestRecord.id,
          },
          isRead: false,
        }),
      );
    }
  }

  private countLeadingFailed(items: TaskCallback[]): number {
    let failed = 0;
    for (const item of items) {
      if (item.status === TaskCallbackStatus.FAILED) failed += 1;
      else break;
    }
    return failed;
  }

  async findAlertNotifications(query?: {
    page?: number;
    pageSize?: number;
    projectId?: string;
    unreadOnly?: boolean;
    type?: string;
  }): Promise<{ list: AlertNotification[]; total: number; unread: number; page: number; pageSize: number }> {
    const page = Math.max(1, Number(query?.page || 1));
    const pageSize = Math.min(Math.max(1, Number(query?.pageSize || 20)), 100);

    const qb = this.alertNotificationRepository.createQueryBuilder('n');
    if (query?.projectId) {
      qb.where('(n.projectId = :projectId OR n.projectId IS NULL)', { projectId: query.projectId });
    }
    if (query?.unreadOnly) {
      qb.andWhere('n.isRead = :isRead', { isRead: false });
    }
    if (query?.type && [AlertNotificationType.CALLBACK_RISK, AlertNotificationType.CALLBACK_RECOVERED].includes(query.type as AlertNotificationType)) {
      qb.andWhere('n.type = :type', { type: query.type });
    }

    const [list, total] = await qb
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const unreadQb = this.alertNotificationRepository.createQueryBuilder('n').where('n.isRead = :isRead', { isRead: false });
    if (query?.projectId) {
      unreadQb.andWhere('(n.projectId = :projectId OR n.projectId IS NULL)', { projectId: query.projectId });
    }
    const unread = await unreadQb.getCount();

    return { list, total, unread, page, pageSize };
  }

  async markAlertNotificationRead(id: string): Promise<void> {
    await this.alertNotificationRepository.update({ id }, { isRead: true, readAt: new Date() });
  }

  async markAllAlertNotificationsRead(projectId?: string): Promise<void> {
    if (projectId) {
      await this.alertNotificationRepository
        .createQueryBuilder()
        .update(AlertNotification)
        .set({ isRead: true, readAt: new Date() })
        .where('isRead = :isRead', { isRead: false })
        .andWhere('(projectId = :projectId OR projectId IS NULL)', { projectId })
        .execute();
      return;
    }

    await this.alertNotificationRepository.update({ isRead: false }, { isRead: true, readAt: new Date() });
  }

  async findCallbacks(taskId: string, query?: {
    page?: number;
    pageSize?: number;
    status?: string;
    batchNo?: string;
    from?: string;
    to?: string;
  }): Promise<{ list: TaskCallback[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, Number(query?.page || 1));
    const pageSize = Math.min(Math.max(1, Number(query?.pageSize || 20)), 100);

    const qb = this.callbackRepository
      .createQueryBuilder('cb')
      .where('cb.taskId = :taskId', { taskId });

    if (query?.status === TaskCallbackStatus.SUCCESS || query?.status === TaskCallbackStatus.FAILED) {
      qb.andWhere('cb.status = :status', { status: query.status });
    }

    if (query?.batchNo) {
      qb.andWhere('cb.batchNo = :batchNo', { batchNo: query.batchNo });
    }

    if (query?.from) {
      const fromDate = new Date(query.from);
      if (!Number.isNaN(fromDate.getTime())) {
        qb.andWhere('cb.createdAt >= :fromDate', { fromDate });
      }
    }

    if (query?.to) {
      const toDate = new Date(query.to);
      if (!Number.isNaN(toDate.getTime())) {
        qb.andWhere('cb.createdAt <= :toDate', { toDate });
      }
    }

    const [list, total] = await qb
      .orderBy('cb.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async getCallbackHealth(taskId: string): Promise<{
    taskId: string;
    threshold: number;
    consecutiveFailed: number;
    risk: boolean;
    latestStatus: string | null;
    latestAt: Date | null;
  }> {
    const threshold = Math.max(1, this.configService.get<number>('taskCallback.alertConsecutiveFailed') ?? 3);
    const callbacks = await this.callbackRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    let consecutiveFailed = 0;
    for (const item of callbacks) {
      if (item.status === TaskCallbackStatus.FAILED) {
        consecutiveFailed += 1;
      } else {
        break;
      }
    }

    return {
      taskId,
      threshold,
      consecutiveFailed,
      risk: consecutiveFailed >= threshold,
      latestStatus: callbacks[0]?.status || null,
      latestAt: callbacks[0]?.createdAt || null,
    };
  }

  async getCallbackAlertOverview(projectId?: string, limit: number = 10): Promise<{
    threshold: number;
    totalRisky: number;
    riskyTasks: Array<{
      taskId: string;
      taskName: string;
      projectId: string;
      triggerUrl: string;
      consecutiveFailed: number;
      latestStatus: string | null;
      latestAt: Date | null;
    }>;
  }> {
    const threshold = Math.max(1, this.configService.get<number>('taskCallback.alertConsecutiveFailed') ?? 3);
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const tasks = await this.taskRepository.find({
      where: {
        ...(projectId ? { projectId } : {}),
        triggerType: 'webhook',
      },
      select: ['id', 'name', 'projectId', 'triggerUrl'],
      take: 200,
      order: { updatedAt: 'DESC' },
    });

    if (!tasks.length) {
      return {
        threshold,
        totalRisky: 0,
        riskyTasks: [],
      };
    }

    const taskIds = tasks.map((item) => item.id);
    const callbacks = await this.callbackRepository.find({
      where: { taskId: In(taskIds) },
      order: { createdAt: 'DESC' },
      take: Math.min(taskIds.length * 20, 4000),
    });

    const taskStateMap = new Map<string, {
      latestStatus: string | null;
      latestAt: Date | null;
      consecutiveFailed: number;
      stopped: boolean;
    }>();

    for (const cb of callbacks) {
      const current = taskStateMap.get(cb.taskId) || {
        latestStatus: null,
        latestAt: null,
        consecutiveFailed: 0,
        stopped: false,
      };

      if (!current.latestAt) {
        current.latestAt = cb.createdAt || null;
        current.latestStatus = cb.status;
      }

      if (!current.stopped) {
        if (cb.status === TaskCallbackStatus.FAILED) {
          current.consecutiveFailed += 1;
        } else {
          current.stopped = true;
        }
      }

      taskStateMap.set(cb.taskId, current);
    }

    const riskyTasks = tasks
      .map((task) => {
        const state = taskStateMap.get(task.id);
        return {
          taskId: task.id,
          taskName: task.name,
          projectId: task.projectId,
          triggerUrl: task.triggerUrl,
          consecutiveFailed: state?.consecutiveFailed || 0,
          latestStatus: state?.latestStatus || null,
          latestAt: state?.latestAt || null,
        };
      })
      .filter((item) => item.consecutiveFailed >= threshold)
      .sort((a, b) => {
        if (b.consecutiveFailed !== a.consecutiveFailed) {
          return b.consecutiveFailed - a.consecutiveFailed;
        }
        return new Date(b.latestAt || 0).getTime() - new Date(a.latestAt || 0).getTime();
      });

    return {
      threshold,
      totalRisky: riskyTasks.length,
      riskyTasks: riskyTasks.slice(0, safeLimit),
    };
  }

  async retryCallback(taskId: string, callbackId: string): Promise<{ success: boolean; attempts: number; responseStatus?: number; errorMessage?: string }> {
    const callback = await this.callbackRepository.findOne({ where: { id: callbackId, taskId } });
    if (!callback) {
      throw new NotFoundException('回调记录不存在');
    }

    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const payload = (callback.requestBody || {}) as Record<string, any>;
    const triggerUrl = callback.callbackUrl;
    if (!triggerUrl) {
      throw new NotFoundException('回调地址不存在');
    }

    const triggerType = callback.triggerType || 'webhook';
    const timeoutMs = Math.max(1000, this.configService.get<number>('taskCallback.timeoutMs') ?? 5000);
    const retryCount = Math.max(0, this.configService.get<number>('taskCallback.retryCount') ?? 2);
    const retryDelayMs = Math.max(200, this.configService.get<number>('taskCallback.retryDelayMs') ?? 1000);
    const callbackSecret = this.configService.get<string>('taskCallback.secret') || '';
    const signatureEnabled = Boolean(callbackSecret);
    const maxAttempts = retryCount + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const signatureHeaders = this.buildTaskCallbackSignatureHeaders(payload, callbackSecret);
        const callbackStartAt = Date.now();
        const response = await axios.post(triggerUrl, payload, {
          timeout: timeoutMs,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json',
            ...signatureHeaders,
          },
        });

        const durationMs = Date.now() - callbackStartAt;
        const statusCode = response.status;
        const isSuccess = statusCode >= 200 && statusCode < 300;

        if (isSuccess) {
          await this.saveTaskCallbackRecord({
            task,
            batchNo: callback.batchNo,
            payload,
            triggerType,
            triggerUrl,
            attempts: attempt,
            status: TaskCallbackStatus.SUCCESS,
            responseStatus: statusCode,
            durationMs,
            signatureEnabled,
          });
          return { success: true, attempts: attempt, responseStatus: statusCode };
        }

        const httpError = `HTTP ${statusCode}`;
        if (attempt >= maxAttempts) {
          await this.saveTaskCallbackRecord({
            task,
            batchNo: callback.batchNo,
            payload,
            triggerType,
            triggerUrl,
            attempts: attempt,
            status: TaskCallbackStatus.FAILED,
            responseStatus: statusCode,
            durationMs,
            signatureEnabled,
            errorMessage: httpError,
          });
          return { success: false, attempts: attempt, responseStatus: statusCode, errorMessage: httpError };
        }

        await this.sleep(retryDelayMs * attempt);
      } catch (error) {
        const detail = this.toLogPreview((error as Error)?.message || error) || 'unknown_error';
        if (attempt >= maxAttempts) {
          await this.saveTaskCallbackRecord({
            task,
            batchNo: callback.batchNo,
            payload,
            triggerType,
            triggerUrl,
            attempts: attempt,
            status: TaskCallbackStatus.FAILED,
            durationMs: 0,
            signatureEnabled,
            errorMessage: detail,
          });
          return { success: false, attempts: attempt, errorMessage: detail };
        }

        await this.sleep(retryDelayMs * attempt);
      }
    }

    return { success: false, attempts: maxAttempts, errorMessage: 'unknown_error' };
  }

  async retryFailedCallbacks(taskId: string, limit: number = 20): Promise<{
    total: number;
    success: number;
    failed: number;
    results: Array<{ callbackId: string; success: boolean; attempts: number; responseStatus?: number; errorMessage?: string }>;
  }> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const failedCallbacks = await this.callbackRepository.find({
      where: { taskId, status: TaskCallbackStatus.FAILED },
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });

    const results: Array<{ callbackId: string; success: boolean; attempts: number; responseStatus?: number; errorMessage?: string }> = [];
    let success = 0;
    let failed = 0;

    for (const item of failedCallbacks) {
      const retried = await this.retryCallback(taskId, item.id);
      results.push({ callbackId: item.id, ...retried });
      if (retried.success) success += 1;
      else failed += 1;
    }

    return {
      total: failedCallbacks.length,
      success,
      failed,
      results,
    };
  }

  private buildTaskCallbackSignatureHeaders(payload: Record<string, any>, secret: string): Record<string, string> {
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());

    if (!secret) {
      return {
        'X-Task-Timestamp': timestamp,
      };
    }

    const signatureBase = `${timestamp}.${body}`;
    const signature = createHmac('sha256', secret).update(signatureBase).digest('hex');
    return {
      'X-Task-Signature': `sha256=${signature}`,
      'X-Task-Timestamp': timestamp,
      'X-Task-Signature-Alg': 'HMAC-SHA256',
    };
  }

  private async getTaskScripts(task: TestTask): Promise<TestScript[]> {
    if (task.scriptIds?.length) {
      return this.scriptRepository.find({ where: { id: In(task.scriptIds) } });
    }

    if (task.projectId) {
      return this.scriptRepository.find({ where: { projectId: task.projectId } });
    }

    throw new Error('任务未配置关联脚本，且未指定项目，已阻止全库脚本执行');
  }

  private async resolveEnvironment(task: TestTask, environment?: string, environmentId?: string): Promise<Environment | null> {
    if (environmentId) {
      return this.environmentRepository.findOne({ where: { id: environmentId } });
    }

    if (task.environmentId) {
      return this.environmentRepository.findOne({ where: { id: task.environmentId } });
    }

    if (environment) {
      return this.environmentRepository.findOne({
        where: {
          type: environment as any,
          ...(task.projectId ? { projectId: task.projectId } : {}),
        },
        order: { isDefault: 'DESC', createdAt: 'DESC' },
      });
    }

    return null;
  }

  private async executeScript(script: TestScript, task: TestTask, environment: Environment | null, batchNo: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      if (script.executionMode === ScriptExecutionMode.PYTHON) {
        return await this.executeByPythonRunner(script, task, environment, startTime, batchNo);
      }

      if (script.type === 'interface') {
        return await this.executeInterfaceScript(script, task, environment, startTime, batchNo);
      } else {
        const result: TestResult = {
          scriptId: script.id,
          scriptName: script.name,
          status: 'skipped',
          duration: Date.now() - startTime,
          error: '暂不支持UI测试执行'
        };
        await this.saveExecution(task, script, environment, result, batchNo);
        return result;
      }
    } catch (error) {
        const result: TestResult = {
          scriptId: script.id,
          scriptName: script.name,
          status: 'failed',
          duration: Date.now() - startTime,
          error: error.message,
          errorStack: error.stack
        };
      await this.saveExecution(task, script, environment, result, batchNo);
      return result;
    }
  }

  private async executeInterfaceScript(script: TestScript, task: TestTask, environment: Environment | null, startTime: number, batchNo: string): Promise<TestResult> {
    try {
      let scriptContent = script.scriptContent;

      const baseUrl = environment?.baseUrl || 'http://localhost:3000';
      scriptContent = scriptContent.replace(/\{\{baseUrl\}\}/g, baseUrl);

      const envHeaders = this.normalizeEnvironmentHeaders(environment);

      const urlMatch = scriptContent.match(/url\s*=\s*['"`]([^'"`]+)['"`]/) || scriptContent.match(/url\s*:\s*['"`]([^'"`]+)['"`]/);
      const methodMatch = scriptContent.match(/method\s*=\s*['"`]([^'"`]+)['"`]/i) || scriptContent.match(/method\s*:\s*['"`]([^'"`]+)['"`]/i);
      const headersBlock = this.extractAssignedObject(scriptContent, 'headers');
      const bodyBlock = this.extractAssignedObject(scriptContent, 'body');

      if (!urlMatch) {
        const fetchMatch = scriptContent.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (!fetchMatch) {
          throw new Error('无法解析脚本中的URL');
        }
        const url = fetchMatch[1];
        
        const response = await axios({
          url,
          method: 'GET',
          timeout: 30000,
          validateStatus: () => true,
          headers: envHeaders
        });

        const duration = Date.now() - startTime;
        const isPassed = response.status >= 200 && response.status < 300;

        const result: TestResult = {
          scriptId: script.id,
          scriptName: script.name,
          status: isPassed ? 'passed' : 'failed',
          duration,
          url,
          method: 'GET',
          requestHeaders: envHeaders,
          response: {
            status: response.status,
            data: response.data
          },
          error: isPassed ? undefined : `HTTP ${response.status}`
        };
        await this.saveExecution(task, script, environment, result, batchNo);
        return result;
      }

      const url = urlMatch[1];
      const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
      const scriptHeaders = headersBlock ? this.parseScriptObject(headersBlock) : {};
      const body = bodyBlock ? this.parseScriptObject(bodyBlock) : undefined;
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...envHeaders,
        ...scriptHeaders,
      };

      const response = await axios({
        url,
        method,
        data: body,
        timeout: 30000,
        validateStatus: () => true,
        headers: requestHeaders
      });

      const duration = Date.now() - startTime;
      const isPassed = response.status >= 200 && response.status < 300;

      const result: TestResult = {
        scriptId: script.id,
        scriptName: script.name,
        status: isPassed ? 'passed' : 'failed',
        duration,
        url,
        method,
        requestHeaders,
        requestBody: body,
        response: {
          status: response.status,
          data: response.data
        },
        error: isPassed ? undefined : `HTTP ${response.status}`
      };
      await this.saveExecution(task, script, environment, result, batchNo);
      return result;

    } catch (error) {
      const result: TestResult = {
        scriptId: script.id,
        scriptName: script.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        errorStack: error.stack
      };
      await this.saveExecution(task, script, environment, result, batchNo);
      return result;
    }
  }

  private async executeByPythonRunner(script: TestScript, task: TestTask, environment: Environment | null, startTime: number, batchNo: string): Promise<TestResult> {
    const runnerUrl = this.configService.get<string>('runner.pythonRunnerUrl');

    if (runnerUrl) {
      return this.executeByPythonRunnerHttp(runnerUrl, script, task, environment, startTime, batchNo);
    }

    return this.executeByPythonRunnerLocal(script, task, environment, startTime, batchNo);
  }

  private async executeByPythonRunnerHttp(runnerUrl: string, script: TestScript, task: TestTask, environment: Environment | null, startTime: number, batchNo: string): Promise<TestResult> {
    const payload = this.buildPythonRunnerPayload(script, task, environment);
    const runnerAuthToken = this.configService.get<string>('runner.authToken');
    const executeUrl = `${runnerUrl.replace(/\/$/, '')}/execute`;
    const retryCount = Math.max(0, this.configService.get<number>('runner.httpRetryCount') ?? 2);
    const retryDelayMs = Math.max(100, this.configService.get<number>('runner.httpRetryDelayMs') ?? 500);
    const retryIdempotentOnly = this.configService.get<boolean>('runner.httpRetryIdempotentOnly') ?? true;
    const canRetryByScript = !retryIdempotentOnly || this.isScriptIdempotentForRetry(script);
    const maxAttempts = retryCount + 1;

    this.logExecutionFlowState(
      'pending',
      task.id,
      script.id,
      `runnerUrl=${executeUrl}, maxAttempts=${maxAttempts}, retryIdempotentOnly=${retryIdempotentOnly}, canRetryByScript=${canRetryByScript}`,
    );

    this.logger.log(
      `尝试调用 Python HTTP Runner: taskId=${task.id}, scriptId=${script.id}, url=${executeUrl}, timeoutMs=35000`,
    );

    let lastError: unknown;
    let attemptsUsed = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      attemptsUsed = attempt;
      this.logExecutionFlowState('running_http', task.id, script.id, `attempt=${attempt}/${maxAttempts}`);

      try {
        const { data } = await axios.post(executeUrl, payload, {
          timeout: 35000,
          headers: runnerAuthToken
            ? { 'X-Runner-Token': runnerAuthToken }
            : undefined,
        });

        this.logger.log(`Python HTTP Runner 调用成功: taskId=${task.id}, scriptId=${script.id}, url=${executeUrl}, attempt=${attempt}/${maxAttempts}`);

        const result: TestResult = {
          scriptId: script.id,
          scriptName: script.name,
          status: data.status === 'passed' ? 'passed' : 'failed',
          duration: data.durationMs || Date.now() - startTime,
          runnerSource: ExecutionRunnerSource.PYTHON_HTTP,
          url: data.request?.url || environment?.baseUrl,
          method: data.request?.method || 'PYTHON',
          requestHeaders: data.request?.headers || environment?.headers || {},
          requestBody: data.request?.body,
          error: data.error || undefined,
          errorStack: data.status === 'passed'
            ? undefined
            : this.enrichWithAttemptMeta(data.logs?.stderr || '', attempt, maxAttempts),
          response: data.response
            ? {
                status: data.response.status,
                data: data.response.body,
              }
            : {
                status: data.exitCode === 0 ? 200 : 500,
                data: {
                  stdout: data.logs?.stdout,
                  stderr: data.logs?.stderr,
                  exitCode: data.exitCode,
                },
              },
          executionMeta: {
            httpAttempt: attempt,
            maxAttempts,
            retryCount: attempt - 1,
            fallbackUsed: false,
            flowState: 'finished',
            lastHttpReason: 'success',
            retryPolicy: retryIdempotentOnly ? 'idempotent_only' : 'always',
            retryEligible: canRetryByScript,
          },
        };

        this.logExecutionFlowState('finished', task.id, script.id, `source=python_http, status=${result.status}`);
        await this.saveExecution(task, script, environment, result, batchNo);
        return result;
      } catch (error) {
        lastError = error;
        const axiosError = this.getAxiosError(error);
        const status = axiosError?.response?.status;

        if (status === 401 || status === 403) {
          const result: TestResult = {
            scriptId: script.id,
            scriptName: script.name,
            status: 'failed',
            duration: Date.now() - startTime,
            runnerSource: ExecutionRunnerSource.PYTHON_HTTP,
            url: environment?.baseUrl,
            method: 'PYTHON',
            requestHeaders: environment?.headers || {},
            error: `Python HTTP Runner 鉴权失败: HTTP ${status}`,
            errorStack: this.enrichWithAttemptMeta(this.formatRunnerHttpError(error, task.id, script.id, executeUrl), attempt, maxAttempts),
            response: {
              status,
              data: axiosError?.response?.data,
            },
            executionMeta: {
              httpAttempt: attempt,
              maxAttempts,
              retryCount: attempt - 1,
              fallbackUsed: false,
              flowState: 'finished',
              lastHttpStatus: status,
              lastHttpCode: axiosError?.code,
              lastHttpReason: 'auth_failed',
              retryPolicy: retryIdempotentOnly ? 'idempotent_only' : 'always',
              retryEligible: canRetryByScript,
            },
          };

          this.logger.error(
            `Python HTTP Runner 鉴权失败，不执行本地回退: ${this.formatRunnerHttpError(error, task.id, script.id, executeUrl)}`,
          );
          this.logExecutionFlowState('finished', task.id, script.id, 'source=python_http, status=failed, reason=auth');
          await this.saveExecution(task, script, environment, result, batchNo);
          return result;
        }

        if (attempt < maxAttempts && canRetryByScript && this.isRetryableRunnerHttpError(error)) {
          const waitMs = retryDelayMs * attempt;
          const reason = this.classifyRunnerHttpReason(axiosError?.response?.status, axiosError?.code);
          this.logExecutionFlowState('retry_waiting', task.id, script.id, `attempt=${attempt}/${maxAttempts}, waitMs=${waitMs}`);
          this.logger.warn(
            `Python HTTP Runner 第${attempt}次调用失败，将重试: reason=${reason}, ${this.formatRunnerHttpError(error, task.id, script.id, executeUrl)}`,
          );
          await this.sleep(waitMs);
          continue;
        }

        if (attempt < maxAttempts && !canRetryByScript) {
          this.logger.warn(
            `Python HTTP Runner 调用失败，不进行重试（非幂等脚本保护）: taskId=${task.id}, scriptId=${script.id}, attempt=${attempt}/${maxAttempts}`,
          );
        }

        break;
      }
    }

    this.logger.warn(
      `Python HTTP Runner 调用失败，回退到本地执行: ${this.formatRunnerHttpError(lastError, task.id, script.id, executeUrl)}`,
    );
    this.logExecutionFlowState('running_local_fallback', task.id, script.id, `reason=runner_http_unavailable, attempts=${maxAttempts}`);
    const lastAxiosError = this.getAxiosError(lastError);
    const localResult = await this.executeByPythonRunnerLocal(script, task, environment, startTime, batchNo);
    localResult.executionMeta = {
      ...(localResult.executionMeta || {}),
      httpAttempt: attemptsUsed,
      maxAttempts,
      retryCount: Math.max(0, attemptsUsed - 1),
      fallbackUsed: true,
      flowState: 'finished',
      lastHttpStatus: lastAxiosError?.response?.status,
      lastHttpCode: lastAxiosError?.code,
      lastHttpReason: this.classifyRunnerHttpReason(lastAxiosError?.response?.status, lastAxiosError?.code),
      retryPolicy: retryIdempotentOnly ? 'idempotent_only' : 'always',
      retryEligible: canRetryByScript,
    };
    this.logExecutionFlowState('finished', task.id, script.id, `source=python_local, status=${localResult.status}`);
    return localResult;
  }

  private isRetryableRunnerHttpError(error: unknown): boolean {
    const axiosError = this.getAxiosError(error);
    if (!axiosError) return false;

    const status = axiosError.response?.status;
    const code = axiosError.code;

    if (status === 429) return true;
    if (status !== undefined && status >= 500) return true;

    const retryableCodes = new Set([
      'ECONNABORTED',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'EAI_AGAIN',
      'ENOTFOUND',
    ]);
    if (code && retryableCodes.has(code)) return true;

    return false;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private enrichWithAttemptMeta(content: string, attempt: number, maxAttempts: number): string {
    const meta = `attempt=${attempt}/${maxAttempts}`;
    if (!content) return meta;
    return `${meta}, ${content}`;
  }

  private classifyRunnerHttpReason(status?: number, code?: string): string {
    if (status === 429) return 'queue_timeout';
    if (status === 401 || status === 403) return 'auth_failed';
    if (status !== undefined && status >= 500) return 'runner_server_error';
    if (code === 'ECONNREFUSED') return 'runner_unreachable';
    if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') return 'runner_timeout';
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'runner_dns_error';
    if (code) return `network_${code.toLowerCase()}`;
    return 'unknown';
  }

  private isScriptIdempotentForRetry(script: TestScript): boolean {
    const content = (script.scriptContent || '').toLowerCase();
    if (!content) return false;

    const nonIdempotentPatterns = [
      /requests\.(post|put|patch|delete)\s*\(/,
      /\.(post|put|patch|delete)\s*\(/,
      /method\s*=\s*['"](post|put|patch|delete)['"]/, 
      /method\s*:\s*['"](post|put|patch|delete)['"]/, 
    ];
    if (nonIdempotentPatterns.some((pattern) => pattern.test(content))) {
      return false;
    }

    const idempotentPatterns = [
      /requests\.(get|head|options)\s*\(/,
      /\.(get|head|options)\s*\(/,
      /method\s*=\s*['"](get|head|options)['"]/, 
      /method\s*:\s*['"](get|head|options)['"]/, 
    ];
    if (idempotentPatterns.some((pattern) => pattern.test(content))) {
      return true;
    }

    return false;
  }

  private logExecutionFlowState(state: ExecutionFlowState, taskId: string, scriptId: string, detail?: string): void {
    this.logger.log(
      `执行状态流转: taskId=${taskId}, scriptId=${scriptId}, state=${state}${detail ? `, ${detail}` : ''}`,
    );
  }

  private getAxiosError(error: unknown): AxiosError | null {
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      return error as AxiosError;
    }
    return null;
  }

  private formatRunnerHttpError(error: unknown, taskId: string, scriptId: string, executeUrl: string): string {
    const axiosError = this.getAxiosError(error);
    if (axiosError) {
      const status = axiosError.response?.status;
      const statusText = axiosError.response?.statusText;
      const errorCode = axiosError.code;
      const timeout = axiosError.config?.timeout;
      const method = axiosError.config?.method?.toUpperCase();
      const responseData = axiosError.response?.data;
      const responsePreview = this.toLogPreview(responseData);

      return [
        `taskId=${taskId}`,
        `scriptId=${scriptId}`,
        `url=${executeUrl}`,
        method ? `method=${method}` : undefined,
        timeout ? `timeoutMs=${timeout}` : undefined,
        errorCode ? `code=${errorCode}` : undefined,
        status ? `status=${status}` : undefined,
        statusText ? `statusText=${statusText}` : undefined,
        `message=${axiosError.message}`,
        responsePreview ? `response=${responsePreview}` : undefined,
      ]
        .filter(Boolean)
        .join(', ');
    }

    if (error instanceof Error) {
      return `taskId=${taskId}, scriptId=${scriptId}, url=${executeUrl}, message=${error.message}`;
    }

    return `taskId=${taskId}, scriptId=${scriptId}, url=${executeUrl}, unknownError=${String(error)}`;
  }

  private toLogPreview(value: unknown): string | undefined {
    if (value === undefined) return undefined;

    if (typeof value === 'string') {
      return value.slice(0, 500);
    }

    try {
      return JSON.stringify(value).slice(0, 500);
    } catch {
      return String(value).slice(0, 500);
    }
  }

  private async executeByPythonRunnerLocal(script: TestScript, task: TestTask, environment: Environment | null, startTime: number, batchNo: string): Promise<TestResult> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-test-python-runner-'));
    const payloadPath = path.join(tempDir, 'payload.json');
    const runnerEntry = path.resolve(process.cwd(), 'python-runner/runner/main.py');
    const pythonBin = this.resolvePythonBin();

    try {
      const payload = this.buildPythonRunnerPayload(script, task, environment, pythonBin);

      await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), 'utf-8');

      const { stdout, stderr } = await this.execFileAsync(pythonBin, ['-m', 'runner.main', '--payload', payloadPath], {
        cwd: path.resolve(process.cwd(), 'python-runner'),
        timeout: 35000,
      });

      const runnerResult = JSON.parse(stdout);
      const result: TestResult = {
        scriptId: script.id,
        scriptName: script.name,
        status: runnerResult.status === 'passed' ? 'passed' : 'failed',
        duration: runnerResult.durationMs || Date.now() - startTime,
        runnerSource: ExecutionRunnerSource.PYTHON_LOCAL,
        url: runnerResult.request?.url || environment?.baseUrl,
        method: runnerResult.request?.method || 'PYTHON',
        requestHeaders: runnerResult.request?.headers || environment?.headers || {},
        requestBody: runnerResult.request?.body,
        error: runnerResult.error || (stderr || undefined),
        errorStack: runnerResult.status === 'passed'
          ? undefined
          : (runnerResult.logs?.stderr || undefined),
        response: runnerResult.response
          ? {
              status: runnerResult.response.status,
              data: runnerResult.response.body,
            }
          : {
              status: runnerResult.exitCode === 0 ? 200 : 500,
              data: {
                stdout: runnerResult.logs?.stdout,
                stderr: runnerResult.logs?.stderr,
                exitCode: runnerResult.exitCode,
              },
            },
      };

      await this.saveExecution(task, script, environment, result, batchNo);
      return result;
    } catch (error) {
      const output = error.stdout || error.stderr;
      let parsed: any = null;
      if (output) {
        try {
          parsed = JSON.parse(output);
        } catch {
          parsed = null;
        }
      }

      const result: TestResult = {
        scriptId: script.id,
        scriptName: script.name,
        status: parsed?.status === 'passed' ? 'passed' : 'failed',
        duration: parsed?.durationMs || Date.now() - startTime,
        runnerSource: ExecutionRunnerSource.PYTHON_LOCAL,
        url: parsed?.request?.url || environment?.baseUrl,
        method: parsed?.request?.method || 'PYTHON',
        requestHeaders: parsed?.request?.headers || environment?.headers || {},
        requestBody: parsed?.request?.body,
        error: parsed?.error || error.message,
        errorStack: parsed?.status === 'passed'
          ? undefined
          : (parsed?.logs?.stderr || error.stderr || error.stack),
        response: parsed
          ? {
              status: parsed.response?.status || (parsed.exitCode === 0 ? 200 : 500),
              data: parsed.response?.body || {
                stdout: parsed.logs?.stdout,
                stderr: parsed.logs?.stderr,
                exitCode: parsed.exitCode,
              },
            }
          : undefined,
      };

      await this.saveExecution(task, script, environment, result, batchNo);
      return result;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  async findExecutions(taskId: string, options?: { all?: boolean; batchNo?: string }): Promise<Array<TestExecution & { failureReason?: string }>> {
    const where: Record<string, any> = { taskId };

    if (options?.batchNo) {
      where.batchNo = options.batchNo;
    } else if (!options?.all) {
      const latest = await this.executionRepository.findOne({
        where: { taskId },
        order: { createdAt: 'DESC' },
      });
      if (latest?.batchNo) {
        where.batchNo = latest.batchNo;
      } else {
        const task = await this.taskRepository.findOne({ where: { id: taskId } });
        if (task?.startTime && task?.endTime) {
          const startWindow = new Date(task.startTime.getTime() - 5000);
          const endWindow = new Date(task.endTime.getTime() + 5000);
          where.startedAt = Between(startWindow, endWindow);
        }
      }
    }

    const list = await this.executionRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return list.map((item) => ({
      ...item,
      failureReason: item.status === ExecutionStatus.FAILED ? this.pickFailureReason(item) : undefined,
    }));
  }

  async findExecutionById(id: string): Promise<TestExecution | null> {
    return this.executionRepository.findOne({ where: { id } });
  }

  async getObservabilityOverview(hours: number = 24): Promise<{
    timeRangeHours: number;
    failedTotal: number;
    byRunnerSource: Record<string, number>;
    topFailureReasons: Array<{ reason: string; count: number }>;
  }> {
    const safeHours = Number.isFinite(hours) ? Math.min(Math.max(1, Math.floor(hours)), 168) : 24;
    const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    const failedExecutions = await this.executionRepository.find({
      where: {
        status: ExecutionStatus.FAILED,
      },
      order: { createdAt: 'DESC' },
      take: 500,
    });

    const filtered = failedExecutions.filter((item) => item.createdAt && item.createdAt >= since);
    const byRunnerSource: Record<string, number> = {};
    const reasonCounter: Record<string, number> = {};

    for (const item of filtered) {
      const source = item.runnerSource || 'unknown';
      byRunnerSource[source] = (byRunnerSource[source] || 0) + 1;

      const reason = this.pickFailureReason(item);
      reasonCounter[reason] = (reasonCounter[reason] || 0) + 1;
    }

    const topFailureReasons = Object.entries(reasonCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    return {
      timeRangeHours: safeHours,
      failedTotal: filtered.length,
      byRunnerSource,
      topFailureReasons,
    };
  }

  async getTaskIdsByFailureReason(reason: string, hours: number = 24): Promise<{
    reason: string;
    timeRangeHours: number;
    taskIds: string[];
    total: number;
  }> {
    const normalizedReason = (reason || '').trim();
    if (!normalizedReason) {
      return { reason: '', timeRangeHours: 24, taskIds: [], total: 0 };
    }

    const safeHours = Number.isFinite(hours) ? Math.min(Math.max(1, Math.floor(hours)), 168) : 24;
    const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    const failedExecutions = await this.executionRepository.find({
      where: {
        status: ExecutionStatus.FAILED,
      },
      order: { createdAt: 'DESC' },
      take: 3000,
    });

    const taskIdSet = new Set<string>();
    for (const item of failedExecutions) {
      if (!item.createdAt || item.createdAt < since) continue;
      if (this.pickFailureReason(item) !== normalizedReason) continue;
      if (item.taskId) taskIdSet.add(item.taskId);
    }

    const taskIds = Array.from(taskIdSet);
    return {
      reason: normalizedReason,
      timeRangeHours: safeHours,
      taskIds,
      total: taskIds.length,
    };
  }

  async diagnosePythonRunner(): Promise<{
    runnerUrl: string | null;
    hasAuthTokenConfigured: boolean;
    health: {
      ok: boolean;
      httpStatus?: number;
      response?: unknown;
      error?: string;
    };
    executeProbe?: {
      ok: boolean;
      httpStatus?: number;
      response?: unknown;
      error?: string;
    };
    statsProbe?: {
      ok: boolean;
      httpStatus?: number;
      response?: unknown;
      error?: string;
    };
  }> {
    const runnerUrl = this.configService.get<string>('runner.pythonRunnerUrl') || null;
    const runnerAuthToken = this.configService.get<string>('runner.authToken') || '';

    if (!runnerUrl) {
      return {
        runnerUrl: null,
        hasAuthTokenConfigured: false,
        health: {
          ok: false,
          error: 'PYTHON_RUNNER_URL 未配置',
        },
      };
    }

    const baseUrl = runnerUrl.replace(/\/$/, '');
    const healthUrl = `${baseUrl}/health`;
    const executeUrl = `${baseUrl}/execute`;
    const statsUrl = `${baseUrl}/stats`;

    try {
      const healthResponse = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: () => true,
      });

      const result: {
        runnerUrl: string;
        hasAuthTokenConfigured: boolean;
        health: {
          ok: boolean;
          httpStatus?: number;
          response?: unknown;
          error?: string;
        };
        executeProbe?: {
          ok: boolean;
          httpStatus?: number;
          response?: unknown;
          error?: string;
        };
        statsProbe?: {
          ok: boolean;
          httpStatus?: number;
          response?: unknown;
          error?: string;
        };
      } = {
        runnerUrl: baseUrl,
        hasAuthTokenConfigured: Boolean(runnerAuthToken),
        health: {
          ok: healthResponse.status >= 200 && healthResponse.status < 300,
          httpStatus: healthResponse.status,
          response: healthResponse.data,
        },
      };

      if (!result.health.ok) {
        result.health.error = `Runner /health 返回异常状态: HTTP ${healthResponse.status}`;
        return result;
      }

      const probePayload = {
        executionId: `DIAG-${Date.now()}`,
        taskId: 'runner-diagnostics',
        script: {
          id: 'runner-diagnostics-script',
          name: 'runner-diagnostics-script',
          language: 'python',
          content: 'print("runner-diagnostics-ok")',
        },
        environment: {
          baseUrl: 'https://example.com',
          headers: {},
          variables: {},
          authConfig: {},
        },
        options: {
          timeoutMs: 5000,
          pythonBin: this.resolvePythonBin(),
        },
      };

      const executeResponse = await axios.post(executeUrl, probePayload, {
        timeout: 8000,
        validateStatus: () => true,
        headers: runnerAuthToken
          ? { 'X-Runner-Token': runnerAuthToken }
          : undefined,
      });

      result.executeProbe = {
        ok: executeResponse.status >= 200 && executeResponse.status < 300,
        httpStatus: executeResponse.status,
        response: this.toLogPreview(executeResponse.data),
      };

      if (!result.executeProbe.ok) {
        result.executeProbe.error = `Runner /execute 调用失败: HTTP ${executeResponse.status}`;
      }

      const statsResponse = await axios.get(statsUrl, {
        timeout: 5000,
        validateStatus: () => true,
        headers: runnerAuthToken
          ? { 'X-Runner-Token': runnerAuthToken }
          : undefined,
      });

      result.statsProbe = {
        ok: statsResponse.status >= 200 && statsResponse.status < 300,
        httpStatus: statsResponse.status,
        response: statsResponse.data,
      };

      if (!result.statsProbe.ok) {
        result.statsProbe.error = `Runner /stats 调用失败: HTTP ${statsResponse.status}`;
      }

      return result;
    } catch (error) {
      const message = this.formatRunnerHttpError(error, 'runner-diagnostics', 'runner-diagnostics', healthUrl);
      return {
        runnerUrl: baseUrl,
        hasAuthTokenConfigured: Boolean(runnerAuthToken),
        health: {
          ok: false,
          error: message,
        },
      };
    }
  }

  private async saveExecution(task: TestTask, script: TestScript, environment: Environment | null, result: TestResult, batchNo?: string) {
    const responseBodyWithMeta = this.attachExecutionMeta(result.response?.data, result.executionMeta);

    const execution = this.executionRepository.create({
      projectId: task.projectId,
      taskId: task.id,
      environmentId: environment?.id,
      scriptId: script.id,
      caseId: script.caseId,
      executionNo: `EXE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      batchNo: batchNo || undefined,
      status: this.mapExecutionStatus(result.status),
      scriptName: script.name,
      requestUrl: result.url,
      requestMethod: result.method,
      runnerSource: result.runnerSource,
      requestHeaders: result.requestHeaders,
      requestBody: result.requestBody,
      responseStatus: result.response?.status,
      responseBody: responseBodyWithMeta,
      errorMessage: result.error,
      errorStack: result.errorStack,
      errorType: this.mapErrorType(result) ?? undefined,
      durationMs: result.duration,
      startedAt: new Date(Date.now() - result.duration),
      finishedAt: new Date(),
    });

    await this.executionRepository.save(execution);
  }

  private attachExecutionMeta(responseData: unknown, executionMeta?: TestResult['executionMeta']): any {
    if (!executionMeta) return responseData;

    if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
      return {
        ...(responseData as Record<string, any>),
        _runnerMeta: executionMeta,
      };
    }

    return {
      _runnerData: responseData,
      _runnerMeta: executionMeta,
    };
  }

  private pickFailureReason(execution: TestExecution): string {
    const body = execution.responseBody as any;
    const reason = body?._runnerMeta?.lastHttpReason;
    if (typeof reason === 'string' && reason) return reason;

    const responseStatus = Number(execution.responseStatus);
    if (Number.isFinite(responseStatus) && responseStatus >= 400) {
      return `http_${responseStatus}`;
    }

    const error = (execution.errorMessage || '').toLowerCase();
    if (error.includes('401') || error.includes('403') || error.includes('unauthorized')) return 'auth_failed';
    if (error.includes('429') || error.includes('queue timeout')) return 'queue_timeout';
    if (error.includes('timeout') || error.includes('timed out')) return 'runner_timeout';
    if (error.includes('econnrefused') || error.includes('connect refused')) return 'runner_unreachable';
    if (error.includes('enotfound') || error.includes('eai_again')) return 'runner_dns_error';
    if (execution.runnerSource === ExecutionRunnerSource.PYTHON_LOCAL) return 'python_local_error';
    return 'unknown';
  }

  private mapExecutionStatus(status: TestResult['status']): ExecutionStatus {
    if (status === 'passed') return ExecutionStatus.PASSED;
    if (status === 'failed') return ExecutionStatus.FAILED;
    if (status === 'skipped') return ExecutionStatus.SKIPPED;
    return ExecutionStatus.PENDING;
  }

  private mapErrorType(result: TestResult): ExecutionErrorType | undefined {
    if (!result.error) return undefined;
    if (result.error.includes('HTTP')) return ExecutionErrorType.ASSERTION;
    if (result.error.includes('URL') || result.error.includes('environment')) return ExecutionErrorType.ENVIRONMENT;
    return ExecutionErrorType.UNKNOWN;
  }

  private normalizeEnvironmentHeaders(environment: Environment | null): Record<string, any> {
    const headers = environment?.headers || {};
    const authConfig = environment?.authConfig || {};

    if (authConfig.type === 'bearer' && authConfig.token) {
      return {
        ...headers,
        Authorization: `Bearer ${authConfig.token}`,
      };
    }

    return headers;
  }

  private parseScriptObject(content: string): Record<string, any> {
    try {
      const normalized = content
        .replace(/\bNone\b/g, 'null')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/'/g, '"')
        .replace(/,\s*([}\]])/g, '$1');

      return JSON.parse(normalized);
    } catch {
      try {
        const normalized = content
          .replace(/\bNone\b/g, 'null')
          .replace(/\bTrue\b/g, 'true')
          .replace(/\bFalse\b/g, 'false');
        return Function(`"use strict"; return (${normalized});`)();
      } catch {
        return {};
      }
    }
  }

  private extractAssignedObject(scriptContent: string, variableName: string): string | null {
    const assignmentIndex = scriptContent.search(new RegExp(`${variableName}\\s*=\\s*\\{`));
    if (assignmentIndex === -1) return null;

    const braceStart = scriptContent.indexOf('{', assignmentIndex);
    if (braceStart === -1) return null;

    let depth = 0;
    for (let index = braceStart; index < scriptContent.length; index += 1) {
      const char = scriptContent[index];
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return scriptContent.slice(braceStart, index + 1);
        }
      }
    }

    return null;
  }

  private resolvePythonBin(): string {
    if (process.env.PYTHON_BIN) {
      return process.env.PYTHON_BIN;
    }

    const venvPython = path.resolve(process.cwd(), 'python-runner/.venv/bin/python');
    if (existsSync(venvPython)) {
      return venvPython;
    }

    return 'python3';
  }

  private buildPythonRunnerPayload(script: TestScript, task: TestTask, environment: Environment | null, pythonBin?: string) {
    return {
      executionId: `RUNNER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      taskId: task.id,
      script: {
        id: script.id,
        name: script.name,
        language: script.language,
        content: script.scriptContent.replace(/\{\{baseUrl\}\}/g, environment?.baseUrl || ''),
      },
      environment: {
        baseUrl: environment?.baseUrl || '',
        headers: environment?.headers || {},
        variables: environment?.variables || {},
        authConfig: environment?.authConfig || {},
      },
      options: {
        timeoutMs: 30000,
        pythonBin: pythonBin || this.resolvePythonBin(),
      },
    };
  }
}
