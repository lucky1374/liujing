import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestReport, ReportType } from './entities/test-report.entity';
import { CreateTestReportDto, QueryTestReportDto } from './dto/test-report.dto';
import { AiService } from '../ai/ai.service';
import { TestTask } from '../test-task/entities/test-task.entity';
import { ExecutionStatus, TestExecution } from '../test-task/entities/test-execution.entity';
import { Defect } from '../defect/entities/defect.entity';

@Injectable()
export class TestReportService {
  constructor(
    @InjectRepository(TestReport)
    private reportRepository: Repository<TestReport>,
    @InjectRepository(TestTask)
    private taskRepository: Repository<TestTask>,
    @InjectRepository(TestExecution)
    private executionRepository: Repository<TestExecution>,
    @InjectRepository(Defect)
    private defectRepository: Repository<Defect>,
    private aiService: AiService,
  ) {}

  async create(createDto: CreateTestReportDto, userId: string): Promise<TestReport> {
    const report = this.reportRepository.create({
      ...createDto,
      createdBy: userId,
    });
    return this.reportRepository.save(report);
  }

  async findAll(query: QueryTestReportDto): Promise<{ list: TestReport[]; total: number }> {
    const { page = 1, pageSize = 10, projectId, relatedTaskId, type } = query;
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (relatedTaskId) where.relatedTaskId = relatedTaskId;
    if (type) where.type = type;

    const [list, total] = await this.reportRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total };
  }

  async findOne(id: string): Promise<TestReport> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException('报告不存在');
    }
    return report;
  }

  async generateByAi(taskId: string, userId: string): Promise<TestReport> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const executions = await this.executionRepository.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });

    if (!executions.length) {
      throw new BadRequestException('任务暂无执行记录，无法生成报告');
    }

    const totalCases = executions.length;
    const passedCases = executions.filter((item) => item.status === ExecutionStatus.PASSED).length;
    const failedCases = executions.filter((item) => item.status === ExecutionStatus.FAILED).length;
    const skippedCases = executions.filter((item) => item.status === ExecutionStatus.SKIPPED).length;
    const blockedCases = 0;
    const passRate = totalCases ? Number(((passedCases / totalCases) * 100).toFixed(2)) : 0;

    task.totalCases = totalCases;
    task.passedCases = passedCases;
    task.failedCases = failedCases;
    task.skippedCases = skippedCases;
    task.blockedCases = blockedCases;
    task.passRate = passRate;
    await this.taskRepository.save(task);

    const defectStats = await this.defectRepository
      .createQueryBuilder('defect')
      .select('defect.status', 'status')
      .addSelect('defect.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('defect.relatedTaskId = :taskId', { taskId })
      .groupBy('defect.status')
      .addGroupBy('defect.severity')
      .getRawMany();

    const totalDefects = defectStats.reduce((sum, d) => sum + parseInt(d.count), 0);
    const openDefects = defectStats.filter(d => d.status === 'open' || d.status === 'in_progress').reduce((sum, d) => sum + parseInt(d.count), 0);
    const criticalDefects = defectStats.filter(d => d.severity === 'critical').reduce((sum, d) => sum + parseInt(d.count), 0);
    const majorDefects = defectStats.filter(d => d.severity === 'major').reduce((sum, d) => sum + parseInt(d.count), 0);
    const minorDefects = defectStats.filter(d => d.severity === 'minor').reduce((sum, d) => sum + parseInt(d.count), 0);

    const defectDistribution = {
      bySeverity: {
        critical: criticalDefects,
        major: majorDefects,
        minor: minorDefects,
      },
      byStatus: defectStats.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + parseInt(item.count);
        return acc;
      }, {}),
    };

    const failureDetails = executions
      .filter((item) => item.status === ExecutionStatus.FAILED)
      .map((item) => ({
        executionId: item.id,
        executionNo: item.executionNo,
        scriptName: item.scriptName,
        requestUrl: item.requestUrl,
        responseStatus: item.responseStatus,
        errorType: item.errorType,
        errorMessage: item.errorMessage,
        durationMs: item.durationMs,
      }));

    const executionSummary = {
      taskName: task.name,
      executionCount: totalCases,
      statusDistribution: {
        passed: passedCases,
        failed: failedCases,
        skipped: skippedCases,
      },
      failureDetails,
    };

    let aiAnalysis = '';
    let aiSuggestions = '';

    try {
      aiAnalysis = await this.aiService.generateReport({
        totalCases,
        passedCases,
        failedCases,
        blockedCases,
        passRate,
        taskName: task.name,
        taskType: task.type,
        totalDefects,
        openDefects,
      });

      aiSuggestions = await this.aiService.generateReport({
        totalCases,
        passedCases,
        failedCases,
        blockedCases,
        passRate,
      });
    } catch (e) {
      console.error('AI生成报告失败:', e.message);
      aiAnalysis = `测试完成，共${totalCases}个执行项，通过${passedCases}个，失败${failedCases}个，跳过${skippedCases}个。`;
      aiSuggestions = failedCases > 0
        ? '建议优先修复失败执行对应脚本或接口问题，并回归验证高优先级场景。'
        : '本次执行整体稳定，建议继续补充边界场景与异常场景覆盖。';
    }

    const report = this.reportRepository.create({
      title: `测试报告 - ${task.name}`,
      projectId: task.projectId,
      type: ReportType.TASK_REPORT,
      relatedTaskId: taskId,
      totalCases,
      passedCases,
      failedCases,
      blockedCases,
      skippedCases,
      passRate,
      totalDefects,
      openDefects,
      criticalDefects,
      majorDefects,
      minorDefects,
      moduleSummary: executionSummary,
      defectDistribution,
      aiAnalysis,
      aiSuggestions,
      isAutoGenerated: true,
      createdBy: userId,
      summary: `本次测试共${totalCases}个执行项，通过${passedCases}个，失败${failedCases}个，跳过${skippedCases}个，通过率${passRate}%`,
      conclusion: passRate >= 80 ? '测试通过' : '测试未通过，建议修复失败执行后重新回归',
    });
    return this.reportRepository.save(report);
  }

  async remove(id: string): Promise<void> {
    const report = await this.findOne(id);
    await this.reportRepository.remove(report);
  }
}
