import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { TestTask, TaskStatus } from './entities/test-task.entity';
import { TestScript, ScriptExecutionMode } from '../test-script/entities/test-script.entity';
import { Environment } from '../environment/entities/environment.entity';
import { ExecutionErrorType, ExecutionRunnerSource, ExecutionStatus, TestExecution } from './entities/test-execution.entity';
import axios from 'axios';

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
}

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
    private configService: ConfigService,
  ) {}

  async executeTask(taskId: string, environment?: string, environmentId?: string): Promise<TestResult[]> {
    const task = await this.taskRepository.findOne({ 
      where: { id: taskId }
    });
    
    if (!task) {
      throw new Error('任务不存在');
    }

    await this.taskRepository.update(taskId, { 
      status: TaskStatus.RUNNING,
      startTime: new Date()
    });

    const results: TestResult[] = [];
    
    try {
      const scripts = await this.getTaskScripts(task);
      const targetEnvironment = await this.resolveEnvironment(task, environment, environmentId);
      
      for (const script of scripts) {
        const result = await this.executeScript(script, task, targetEnvironment);
        results.push(result);
      }

      const passedCount = results.filter(r => r.status === 'passed').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      const passRate = scripts.length > 0 ? (passedCount / scripts.length) * 100 : 0;

      await this.taskRepository.update(taskId, {
        status: failedCount > 0 ? TaskStatus.FAILED : TaskStatus.COMPLETED,
        endTime: new Date(),
        passedCases: passedCount,
        failedCases: failedCount,
        passRate: Math.round(passRate * 100) / 100,
        totalCases: scripts.length
      });

    } catch (error) {
      this.logger.error(`任务执行失败: ${error.message}`);
      await this.taskRepository.update(taskId, {
        status: TaskStatus.FAILED,
        endTime: new Date()
      });
    }

    return results;
  }

  private async getTaskScripts(task: TestTask): Promise<TestScript[]> {
    if (task.scriptIds?.length) {
      return this.scriptRepository.find({ where: { id: In(task.scriptIds) } });
    }

    if (task.projectId) {
      return this.scriptRepository.find({ where: { projectId: task.projectId } });
    }

    return this.scriptRepository.find();
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

  private async executeScript(script: TestScript, task: TestTask, environment: Environment | null): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      if (script.executionMode === ScriptExecutionMode.PYTHON) {
        return await this.executeByPythonRunner(script, task, environment, startTime);
      }

      if (script.type === 'interface') {
        return await this.executeInterfaceScript(script, task, environment, startTime);
      } else {
        const result: TestResult = {
          scriptId: script.id,
          scriptName: script.name,
          status: 'skipped',
          duration: Date.now() - startTime,
          error: '暂不支持UI测试执行'
        };
        await this.saveExecution(task, script, environment, result);
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
      await this.saveExecution(task, script, environment, result);
      return result;
    }
  }

  private async executeInterfaceScript(script: TestScript, task: TestTask, environment: Environment | null, startTime: number): Promise<TestResult> {
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
        await this.saveExecution(task, script, environment, result);
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
      await this.saveExecution(task, script, environment, result);
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
      await this.saveExecution(task, script, environment, result);
      return result;
    }
  }

  private async executeByPythonRunner(script: TestScript, task: TestTask, environment: Environment | null, startTime: number): Promise<TestResult> {
    const runnerUrl = this.configService.get<string>('runner.pythonRunnerUrl');

    if (runnerUrl) {
      return this.executeByPythonRunnerHttp(runnerUrl, script, task, environment, startTime);
    }

    return this.executeByPythonRunnerLocal(script, task, environment, startTime);
  }

  private async executeByPythonRunnerHttp(runnerUrl: string, script: TestScript, task: TestTask, environment: Environment | null, startTime: number): Promise<TestResult> {
    const payload = this.buildPythonRunnerPayload(script, task, environment);

    try {
      const { data } = await axios.post(`${runnerUrl.replace(/\/$/, '')}/execute`, payload, {
        timeout: 35000,
      });

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
        errorStack: data.status === 'passed' ? undefined : (data.logs?.stderr || undefined),
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
      };

      await this.saveExecution(task, script, environment, result);
      return result;
    } catch (error) {
      this.logger.warn(`HTTP runner 调用失败，回退到本地执行: ${error.message}`);
      return this.executeByPythonRunnerLocal(script, task, environment, startTime);
    }
  }

  private async executeByPythonRunnerLocal(script: TestScript, task: TestTask, environment: Environment | null, startTime: number): Promise<TestResult> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-test-python-runner-'));
    const payloadPath = path.join(tempDir, 'payload.json');
    const runnerEntry = path.resolve(process.cwd(), 'python-runner/runner/main.py');
    const pythonBin = this.resolvePythonBin();

    try {
      const payload = this.buildPythonRunnerPayload(script, task, environment, pythonBin);

      await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), 'utf-8');

      const { stdout, stderr } = await this.execFileAsync(pythonBin, [runnerEntry, '--payload', payloadPath], {
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

      await this.saveExecution(task, script, environment, result);
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

      await this.saveExecution(task, script, environment, result);
      return result;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  async findExecutions(taskId: string): Promise<TestExecution[]> {
    return this.executionRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  async findExecutionById(id: string): Promise<TestExecution | null> {
    return this.executionRepository.findOne({ where: { id } });
  }

  private async saveExecution(task: TestTask, script: TestScript, environment: Environment | null, result: TestResult) {
    const execution = this.executionRepository.create({
      projectId: task.projectId,
      taskId: task.id,
      environmentId: environment?.id,
      scriptId: script.id,
      caseId: script.caseId,
      executionNo: `EXE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: this.mapExecutionStatus(result.status),
      scriptName: script.name,
      requestUrl: result.url,
      requestMethod: result.method,
      runnerSource: result.runnerSource,
      requestHeaders: result.requestHeaders,
      requestBody: result.requestBody,
      responseStatus: result.response?.status,
      responseBody: result.response?.data,
      errorMessage: result.error,
      errorStack: result.errorStack,
      errorType: this.mapErrorType(result) ?? undefined,
      durationMs: result.duration,
      startedAt: new Date(Date.now() - result.duration),
      finishedAt: new Date(),
    });

    await this.executionRepository.save(execution);
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
