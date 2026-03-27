import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Defect, DefectSeverity, DefectSource, DefectStatus, DefectType } from './entities/defect.entity';
import { CreateDefectDto, UpdateDefectDto, QueryDefectDto } from './dto/defect.dto';
import { AiService } from '../ai/ai.service';
import { TestExecution } from '../test-task/entities/test-execution.entity';

@Injectable()
export class DefectService {
  constructor(
    @InjectRepository(Defect)
    private defectRepository: Repository<Defect>,
    @InjectRepository(TestExecution)
    private executionRepository: Repository<TestExecution>,
    private aiService: AiService,
  ) {}

  async create(createDto: CreateDefectDto, userId: string): Promise<Defect> {
    const defect = this.defectRepository.create({
      ...createDto,
      reporterId: userId,
    });
    return this.defectRepository.save(defect);
  }

  async findAll(query: QueryDefectDto): Promise<{ list: Defect[]; total: number }> {
    const { page = 1, pageSize = 10, projectId, relatedTaskId, status, severity, type, module } = query;
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (relatedTaskId) where.relatedTaskId = relatedTaskId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (module) where.module = module;

    const [list, total] = await this.defectRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total };
  }

  async findOne(id: string): Promise<Defect> {
    const defect = await this.defectRepository.findOne({ where: { id } });
    if (!defect) {
      throw new NotFoundException('缺陷不存在');
    }
    return defect;
  }

  async update(id: string, updateDto: UpdateDefectDto): Promise<Defect> {
    const defect = await this.findOne(id);
    Object.assign(defect, updateDto);
    return this.defectRepository.save(defect);
  }

  async createFromExecution(executionId: string, userId: string): Promise<Defect> {
    const execution = await this.executionRepository.findOne({ where: { id: executionId } });
    if (!execution) {
      throw new NotFoundException('执行记录不存在');
    }

    const defect = this.defectRepository.create({
      projectId: execution.projectId,
      title: `执行失败 - ${execution.scriptName || execution.executionNo}`,
      description: `由执行记录自动转缺陷\n执行编号: ${execution.executionNo}`,
      type: DefectType.FUNCTIONAL,
      severity: this.mapSeverity(execution.responseStatus),
      status: DefectStatus.OPEN,
      source: DefectSource.AI_DETECTED,
      module: '任务执行',
      relatedCaseId: execution.caseId,
      relatedScriptId: execution.scriptId,
      relatedTaskId: execution.taskId,
      environment: execution.environmentId,
      stepsToReproduce: execution.requestUrl || '请根据执行记录复现',
      actualResult: execution.errorMessage || `接口响应状态码: ${execution.responseStatus || 'unknown'}`,
      expectedResult: '任务执行成功，断言全部通过',
      logs: JSON.stringify({
        requestUrl: execution.requestUrl,
        responseStatus: execution.responseStatus,
        responseBody: execution.responseBody,
        errorMessage: execution.errorMessage,
      }),
      reporterId: userId,
    });

    return this.defectRepository.save(defect);
  }

  private mapSeverity(responseStatus?: number | null): DefectSeverity {
    if (!responseStatus) return DefectSeverity.MAJOR;
    if (responseStatus >= 500) return DefectSeverity.CRITICAL;
    if (responseStatus >= 400) return DefectSeverity.MAJOR;
    return DefectSeverity.MINOR;
  }

  async analyzeByAi(id: string): Promise<Defect> {
    const defect = await this.findOne(id);
    const result = await this.aiService.analyzeDefect(defect.logs || '', defect.description);
    defect.aiSuggestion = result.suggestion;
    defect.rootCauseAnalysis = result.rootCause;
    return this.defectRepository.save(defect);
  }

  async remove(id: string): Promise<void> {
    const defect = await this.findOne(id);
    await this.defectRepository.remove(defect);
  }

  async getStatistics(projectId?: string): Promise<{ total: number; open: number; resolved: number }> {
    const baseWhere = projectId ? { projectId } : {};
    const total = await this.defectRepository.count({ where: baseWhere });
    const open = await this.defectRepository.count({ where: { ...baseWhere, status: DefectStatus.OPEN } });
    const resolved = await this.defectRepository.count({ where: { ...baseWhere, status: DefectStatus.RESOLVED } });

    return { total, open, resolved };
  }
}
