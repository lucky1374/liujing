import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { TestScript, ScriptType, ScriptStatus, ScriptSource, ScriptLanguage, ScriptExecutionMode } from './entities/test-script.entity';
import { TestCase } from '../test-case/entities/test-case.entity';
import { CreateTestScriptDto, UpdateTestScriptDto, QueryTestScriptDto } from './dto/test-script.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TestScriptService {
  constructor(
    @InjectRepository(TestScript)
    private scriptRepository: Repository<TestScript>,
    @InjectRepository(TestCase)
    private testCaseRepository: Repository<TestCase>,
    private aiService: AiService,
  ) {}

  async create(createDto: CreateTestScriptDto, userId: string): Promise<TestScript> {
    const script = this.scriptRepository.create({
      ...createDto,
      createdBy: userId,
    });
    return this.scriptRepository.save(script);
  }

  async findAll(query: QueryTestScriptDto): Promise<{ list: TestScript[]; total: number }> {
    const { page = 1, pageSize = 10, projectId, module, type, status, keyword } = query;
    const where: any = {};

    if (projectId) where.projectId = projectId;
    if (module) where.module = module;
    if (type) where.type = type;
    if (status) where.status = status;
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }

    const [list, total] = await this.scriptRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total };
  }

  async findOne(id: string): Promise<TestScript> {
    const script = await this.scriptRepository.findOne({ where: { id } });
    if (!script) {
      throw new NotFoundException('脚本不存在');
    }
    return script;
  }

  async update(id: string, updateDto: UpdateTestScriptDto, userId: string): Promise<TestScript> {
    const script = await this.findOne(id);
    Object.assign(script, updateDto, { updatedBy: userId });
    return this.scriptRepository.save(script);
  }

  async remove(id: string): Promise<void> {
    const script = await this.findOne(id);
    await this.scriptRepository.remove(script);
  }

  async generateByAi(testCaseId: string, scriptType: 'interface' | 'ui', userId: string): Promise<TestScript> {
    const testCase = await this.testCaseRepository.findOne({ where: { id: testCaseId } });
    if (!testCase) {
      throw new NotFoundException('测试用例不存在');
    }

    let scriptContent = '';
    try {
      scriptContent = await this.aiService.generateScript(
        {
          name: testCase.name,
          description: testCase.description,
          preconditions: testCase.preconditions,
          testSteps: testCase.testSteps,
          expectedResult: testCase.expectedResult,
          module: testCase.module,
          priority: testCase.priority
        },
        scriptType
      );
    } catch (e) {
      console.error('AI生成脚本失败:', e.message);
      if (scriptType === 'interface') {
        scriptContent = `import requests

def test_${testCase.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}():
    """
    用例名称: ${testCase.name}
    描述: ${testCase.description}
    """
    url = "http://localhost:3000/api/endpoint"
    headers = {"Content-Type": "application/json"}
    
    # 前置条件: ${testCase.preconditions}
    # 测试步骤: ${testCase.testSteps}
    # 预期结果: ${testCase.expectedResult}
    
    response = requests.post(url, json={}, headers=headers)
    assert response.status_code == 200
    
if __name__ == "__main__":
    test_${testCase.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}()
`;
      } else {
        scriptContent = `from selenium import webdriver
from selenium.webdriver.common.by import By
import time

def test_${testCase.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}():
    """
    用例名称: ${testCase.name}
    描述: ${testCase.description}
    """
    driver = webdriver.Chrome()
    try:
        # 前置条件: ${testCase.preconditions}
        # 测试步骤: ${testCase.testSteps}
        # 预期结果: ${testCase.expectedResult}
        
        driver.get("http://localhost:3000")
        time.sleep(2)
        
    finally:
        driver.quit()

if __name__ == "__main__":
    test_${testCase.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}()
`;
      }
    }

    const script = this.scriptRepository.create({
      name: `${testCase.name} - 自动化脚本`,
      projectId: testCase.projectId,
      caseId: testCase.id,
      type: scriptType === 'interface' ? ScriptType.INTERFACE : ScriptType.UI,
      language: ScriptLanguage.PYTHON,
      module: testCase.module,
      scriptContent,
      executionMode: ScriptExecutionMode.LITE,
      source: ScriptSource.AI_GENERATED,
      status: ScriptStatus.VALID,
      createdBy: userId,
    });

    return this.scriptRepository.save(script);
  }
}
