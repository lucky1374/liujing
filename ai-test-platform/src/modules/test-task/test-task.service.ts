import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TestTask, TaskStatus } from './entities/test-task.entity';
import { CreateTestTaskDto, UpdateTestTaskDto, QueryTestTaskDto } from './dto/test-task.dto';
import { TestScript } from '../test-script/entities/test-script.entity';
import { Environment } from '../environment/entities/environment.entity';

@Injectable()
export class TestTaskService {
  constructor(
    @InjectRepository(TestTask)
    private taskRepository: Repository<TestTask>,
    @InjectRepository(TestScript)
    private scriptRepository: Repository<TestScript>,
    @InjectRepository(Environment)
    private environmentRepository: Repository<Environment>,
  ) {}

  async create(createDto: CreateTestTaskDto, userId: string): Promise<TestTask> {
    await this.validateAssociations(createDto.projectId, createDto.environmentId, createDto.scriptIds);

    const task = this.taskRepository.create({
      ...createDto,
      createdBy: userId,
    });
    return this.taskRepository.save(task);
  }

  async findAll(query: QueryTestTaskDto): Promise<{ list: TestTask[]; total: number }> {
    const { page = 1, pageSize = 10, id, projectId, taskIds, status, type, priority } = query;
    const where: any = {};

    if (id) where.id = id;
    if (!id && taskIds) {
      const ids = taskIds
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (ids.length) {
        where.id = In(ids);
      }
    }
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;

    const [list, total] = await this.taskRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total };
  }

  async findOne(id: string): Promise<TestTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }
    return task;
  }

  async update(id: string, updateDto: UpdateTestTaskDto): Promise<TestTask> {
    const task = await this.findOne(id);
    await this.validateAssociations(task.projectId, updateDto.environmentId, updateDto.scriptIds);
    Object.assign(task, updateDto);
    return this.taskRepository.save(task);
  }

  async updateStatus(id: string, status: TaskStatus): Promise<TestTask> {
    const task = await this.findOne(id);
    task.status = status;
    if (status === TaskStatus.RUNNING) {
      task.startTime = new Date();
    } else if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      task.endTime = new Date();
    }
    return this.taskRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.taskRepository.remove(task);
  }

  async getStatistics(projectId?: string): Promise<{ total: number; pending: number; running: number; completed: number; failed: number }> {
    const baseWhere = projectId ? { projectId } : {};
    const total = await this.taskRepository.count({ where: baseWhere });
    const pending = await this.taskRepository.count({ where: { ...baseWhere, status: TaskStatus.PENDING } });
    const running = await this.taskRepository.count({ where: { ...baseWhere, status: TaskStatus.RUNNING } });
    const completed = await this.taskRepository.count({ where: { ...baseWhere, status: TaskStatus.COMPLETED } });
    const failed = await this.taskRepository.count({ where: { ...baseWhere, status: TaskStatus.FAILED } });

    return { total, pending, running, completed, failed };
  }

  private async validateAssociations(projectId?: string, environmentId?: string, scriptIds?: string[]) {
    if (environmentId) {
      const environment = await this.environmentRepository.findOne({ where: { id: environmentId } });
      if (!environment) {
        throw new BadRequestException('执行环境不存在');
      }
      if (projectId && environment.projectId && environment.projectId !== projectId) {
        throw new BadRequestException('执行环境与项目不匹配');
      }
    }

    if (scriptIds?.length) {
      const scripts = await this.scriptRepository.find({ where: { id: In(scriptIds) } });
      if (scripts.length !== scriptIds.length) {
        throw new BadRequestException('存在无效的脚本ID');
      }
      if (projectId && scripts.some((script) => script.projectId && script.projectId !== projectId)) {
        throw new BadRequestException('脚本与项目不匹配');
      }
    }
  }
}
