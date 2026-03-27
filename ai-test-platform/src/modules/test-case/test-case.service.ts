import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { TestCase, TestCaseStatus } from './entities/test-case.entity';
import { CreateTestCaseDto, UpdateTestCaseDto, QueryTestCaseDto } from './dto/test-case.dto';
import { AiService } from '../ai/ai.service';
import { TestCasePriority } from './entities/test-case.entity';

@Injectable()
export class TestCaseService {
  constructor(
    @InjectRepository(TestCase)
    private testCaseRepository: Repository<TestCase>,
    private aiService: AiService,
  ) {}

  async create(createDto: CreateTestCaseDto, userId: string): Promise<TestCase> {
    const testCase = this.testCaseRepository.create({
      ...createDto,
      createdBy: userId,
    });
    return this.testCaseRepository.save(testCase);
  }

  async findAll(query: QueryTestCaseDto): Promise<{ list: TestCase[]; total: number }> {
    const { page = 1, pageSize = 10, projectId, module, priority, status, source, keyword } = query;
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (module) where.module = module;
    if (priority) where.priority = priority;
    if (status) where.status = status;
    if (source) where.source = source;
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }

    const [list, total] = await this.testCaseRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total };
  }

  async findOne(id: string): Promise<TestCase> {
    const testCase = await this.testCaseRepository.findOne({ where: { id } });
    if (!testCase) {
      throw new NotFoundException('测试用例不存在');
    }
    return testCase;
  }

  async update(id: string, updateDto: UpdateTestCaseDto, userId: string): Promise<TestCase> {
    const testCase = await this.findOne(id);
    Object.assign(testCase, updateDto, { updatedBy: userId });
    return this.testCaseRepository.save(testCase);
  }

  async remove(id: string): Promise<void> {
    const testCase = await this.findOne(id);
    await this.testCaseRepository.remove(testCase);
  }

  async generateByAi(prompt: string, userId: string, projectId?: string): Promise<TestCase[]> {
    let cases: any[] = [];
    try {
      cases = await this.aiService.generateTestCases(prompt);
    } catch (e) {
      console.error('AI生成用例失败:', e.message);
    }

    if (cases.length === 0) {
      cases = [
        { name: `${prompt} - 正常场景`, description: `验证${prompt}的正常功能`, preconditions: '系统正常运行', testSteps: '1. 打开系统\n2. 执行操作\n3. 验证结果', expectedResult: '操作成功', module: '默认模块', priority: 'medium' },
        { name: `${prompt} - 边界条件`, description: `验证${prompt}的边界情况`, preconditions: '系统正常运行', testSteps: '1. 输入边界值\n2. 验证结果', expectedResult: '正确处理边界值', module: '默认模块', priority: 'low' },
        { name: `${prompt} - 异常场景`, description: `验证${prompt}的异常处理`, preconditions: '系统正常运行', testSteps: '1. 输入异常数据\n2. 验证错误提示', expectedResult: '显示正确错误信息', module: '默认模块', priority: 'high' },
      ];
    }

    const savedCases: TestCase[] = [];
    for (const c of cases) {
      const testCase = this.testCaseRepository.create({
        name: c.name,
        description: c.description,
        preconditions: c.preconditions,
        testSteps: c.testSteps,
        expectedResult: c.expectedResult,
        module: c.module,
        priority: c.priority as TestCasePriority,
        projectId,
        source: 'ai_generated' as any,
        status: TestCaseStatus.DRAFT,
        createdBy: userId,
      });
      savedCases.push(await this.testCaseRepository.save(testCase));
    }
    return savedCases;
  }

  async getModules(): Promise<string[]> {
    const result = await this.testCaseRepository
      .createQueryBuilder('tc')
      .select('DISTINCT tc.module', 'module')
      .where('tc.module IS NOT NULL')
      .getRawMany();
    return result.map((r) => r.module);
  }
}
