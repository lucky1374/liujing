import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { TestCase, TestCaseSource, TestCaseStatus, TestCaseType } from './entities/test-case.entity';
import { CreateTasksFromImportedScriptsDto, CreateTestCaseDto, OpenApiImportDto, OpenApiImportMode, OpenApiPreviewDto, OpenApiSourceType, QueryTestCaseDto, UpdateTestCaseDto } from './dto/test-case.dto';
import { AiService } from '../ai/ai.service';
import { TestCasePriority } from './entities/test-case.entity';
import { ScriptExecutionMode, ScriptLanguage, ScriptSource, ScriptStatus, ScriptType, TestScript } from '../test-script/entities/test-script.entity';
import axios from 'axios';
import { load as parseYaml } from 'js-yaml';
import { ExecuteEnvironment, ExecuteType, TaskPriority, TaskType, TestTask } from '../test-task/entities/test-task.entity';

interface OpenApiOperation {
  key: string;
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  requestExample: any;
  responseStatus: string;
  existsInProject?: boolean;
  existingCaseId?: string;
}

@Injectable()
export class TestCaseService {
  constructor(
    @InjectRepository(TestCase)
    private testCaseRepository: Repository<TestCase>,
    @InjectRepository(TestScript)
    private testScriptRepository: Repository<TestScript>,
    @InjectRepository(TestTask)
    private testTaskRepository: Repository<TestTask>,
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

  async previewOpenApi(payload: OpenApiPreviewDto) {
    let operations = await this.extractOpenApiOperations(payload);
    if (payload.projectId) {
      operations = await this.attachExistingCaseFlags(payload.projectId, operations);
    }
    return {
      count: operations.length,
      operations,
    };
  }

  async importOpenApi(payload: OpenApiImportDto, userId: string) {
    const operations = await this.extractOpenApiOperations(payload);
    const selectedSet = payload.selectedOperations?.length
      ? new Set(payload.selectedOperations)
      : null;
    const targetOperations = selectedSet
      ? operations.filter((item) => selectedSet.has(item.key))
      : operations;

    if (!targetOperations.length) {
      throw new BadRequestException('没有可导入的接口');
    }

    const createScripts = payload.createScripts !== false;
    const importMode = this.resolveImportMode(payload);
    const skipExisting = importMode === OpenApiImportMode.SKIP;
    const existingMap = await this.loadExistingOpenApiCaseMap(payload.projectId);
    const overrideMap = new Map((payload.operationOverrides || []).map((item) => [item.key, item]));
    const createdCases: TestCase[] = [];
    const createdScripts: TestScript[] = [];
    const updatedCases: TestCase[] = [];
    const updatedScripts: TestScript[] = [];
    const skippedExisting: Array<{ key: string; caseId?: string }> = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const baseUrl = this.normalizeBaseUrl(payload.baseUrl) || 'http://localhost:3000';
    const defaultHeaders = this.normalizeDefaultHeaders(payload.defaultHeaders);

    for (const operation of targetOperations) {
      const marker = this.buildOpenApiCaseMarker(operation.key);
      const existingCaseId = existingMap.get(marker);
      if (skipExisting && existingCaseId) {
        skippedExisting.push({
          key: operation.key,
          caseId: existingCaseId,
        });
        skippedCount += 1;
        continue;
      }

      const override = overrideMap.get(operation.key);
      let savedCase: TestCase | null = null;
      if (existingCaseId && importMode === OpenApiImportMode.UPSERT) {
        const existingCase = await this.testCaseRepository.findOne({ where: { id: existingCaseId } });
        if (existingCase) {
          savedCase = await this.updateImportedCase(existingCase, operation, override, payload, userId);
          updatedCases.push(savedCase);
          updatedCount += 1;
        }
      }

      if (!savedCase) {
        const moduleName = override?.moduleName || payload.moduleName || operation.tags?.[0] || 'OpenAPI导入';
        const caseName = override?.caseName || `${operation.method} ${operation.path}`;
        const priority = override?.priority || TestCasePriority.MEDIUM;
        const testCase = this.testCaseRepository.create({
          projectId: payload.projectId,
          name: caseName,
          description: operation.summary || operation.description || 'OpenAPI 导入用例',
          preconditions: '已完成鉴权并准备测试环境',
          testSteps: `1. 按 ${operation.method} ${operation.path} 发起请求\n2. 使用样例参数执行\n3. 校验响应状态与关键字段`,
          expectedResult: `接口返回 ${operation.responseStatus} 且业务字段符合预期`,
          module: moduleName,
          priority,
          type: TestCaseType.INTERFACE,
          source: TestCaseSource.IMPORTED,
          status: TestCaseStatus.DRAFT,
          remarks: marker,
          createdBy: userId,
        });
        savedCase = await this.testCaseRepository.save(testCase);
        createdCases.push(savedCase);
        createdCount += 1;
      }

      existingMap.set(marker, savedCase.id);

      if (createScripts) {
        const existingScript = existingCaseId && importMode === OpenApiImportMode.UPSERT
          ? await this.findImportedScriptByCaseId(savedCase.id)
          : null;

        if (existingScript) {
          const updatedScript = await this.updateImportedScript(existingScript, savedCase, operation, baseUrl, defaultHeaders, userId);
          updatedScripts.push(updatedScript);
        } else {
          const script = this.testScriptRepository.create({
            name: `${savedCase.name} - 导入脚本`,
            projectId: payload.projectId,
            caseId: savedCase.id,
            description: operation.summary || 'OpenAPI 导入脚本',
            type: ScriptType.INTERFACE,
            language: ScriptLanguage.PYTHON,
            executionMode: ScriptExecutionMode.LITE,
            module: savedCase.module,
            scriptContent: this.buildImportedScript(operation, baseUrl, defaultHeaders),
            source: ScriptSource.IMPORTED,
            status: ScriptStatus.VALID,
            createdBy: userId,
          });
          createdScripts.push(await this.testScriptRepository.save(script));
        }
      }
    }

    return {
      importedCases: createdCases.length + updatedCases.length,
      importedScripts: createdScripts.length + updatedScripts.length,
      skippedExistingCount: skippedExisting.length,
      createdCount,
      updatedCount,
      skippedCount,
      skippedExisting,
      cases: createdCases,
      scripts: createdScripts,
    };
  }

  private resolveImportMode(payload: OpenApiImportDto): OpenApiImportMode {
    if (payload.importMode) {
      return payload.importMode;
    }
    if (payload.skipExisting === false) {
      return OpenApiImportMode.UPSERT;
    }
    return OpenApiImportMode.SKIP;
  }

  private async updateImportedCase(
    existingCase: TestCase,
    operation: OpenApiOperation,
    override: { caseName?: string; moduleName?: string; priority?: TestCasePriority } | undefined,
    payload: OpenApiImportDto,
    userId: string,
  ): Promise<TestCase> {
    const moduleName = override?.moduleName || payload.moduleName || operation.tags?.[0] || 'OpenAPI导入';
    const caseName = override?.caseName || `${operation.method} ${operation.path}`;
    const priority = override?.priority || TestCasePriority.MEDIUM;
    Object.assign(existingCase, {
      name: caseName,
      description: operation.summary || operation.description || 'OpenAPI 导入用例',
      preconditions: '已完成鉴权并准备测试环境',
      testSteps: `1. 按 ${operation.method} ${operation.path} 发起请求\n2. 使用样例参数执行\n3. 校验响应状态与关键字段`,
      expectedResult: `接口返回 ${operation.responseStatus} 且业务字段符合预期`,
      module: moduleName,
      priority,
      remarks: this.buildOpenApiCaseMarker(operation.key),
      updatedBy: userId,
    });
    return this.testCaseRepository.save(existingCase);
  }

  private async findImportedScriptByCaseId(caseId: string): Promise<TestScript | null> {
    return this.testScriptRepository.findOne({
      where: {
        caseId,
        source: ScriptSource.IMPORTED,
        type: ScriptType.INTERFACE,
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async updateImportedScript(
    existingScript: TestScript,
    testCase: TestCase,
    operation: OpenApiOperation,
    baseUrl: string,
    defaultHeaders: Record<string, any>,
    userId: string,
  ): Promise<TestScript> {
    Object.assign(existingScript, {
      name: `${testCase.name} - 导入脚本`,
      description: operation.summary || 'OpenAPI 导入脚本',
      module: testCase.module,
      scriptContent: this.buildImportedScript(operation, baseUrl, defaultHeaders),
      updatedBy: userId,
    });
    return this.testScriptRepository.save(existingScript);
  }

  async createTasksFromImportedScripts(payload: CreateTasksFromImportedScriptsDto, userId: string) {
    const modules = (payload.modules || []).map((item) => String(item || '').trim()).filter(Boolean);
    const executeEnvironments = payload.executeEnvironments?.length
      ? payload.executeEnvironments
      : [ExecuteEnvironment.TEST];
    const taskPrefix = String(payload.taskPrefix || 'OpenAPI导入').trim();
    const skipExistingTasks = payload.skipExistingTasks !== false;

    if (payload.triggerType === 'webhook' && !payload.triggerUrl) {
      throw new BadRequestException('triggerType=webhook 时必须提供 triggerUrl');
    }

    const scriptWhere: any = {
      projectId: payload.projectId,
      source: ScriptSource.IMPORTED,
      type: ScriptType.INTERFACE,
    };
    if (modules.length) {
      scriptWhere.module = In(modules);
    }

    const scripts = await this.testScriptRepository.find({
      where: scriptWhere,
      order: { createdAt: 'DESC' },
    });

    if (!scripts.length) {
      throw new BadRequestException('未找到可用于建任务的导入脚本');
    }

    const grouped = new Map<string, TestScript[]>();
    for (const script of scripts) {
      const key = String(script.module || 'OpenAPI未分组').trim() || 'OpenAPI未分组';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(script);
    }

    const createdTasks: TestTask[] = [];
    const skippedModules: string[] = [];
    const existingTasks: TestTask[] = [];

    for (const [moduleName, moduleScripts] of grouped.entries()) {
      const marker = `openapiAutoTask:${payload.projectId}:${moduleName}`;
      if (skipExistingTasks) {
        const exists = await this.testTaskRepository.findOne({
          where: {
            projectId: payload.projectId,
            type: TaskType.INTERFACE_TEST,
            remarks: marker,
          },
        });
        if (exists) {
          skippedModules.push(moduleName);
          existingTasks.push(exists);
          continue;
        }
      }

      const task = this.testTaskRepository.create({
        projectId: payload.projectId,
        name: `${taskPrefix}-${moduleName}`,
        description: `由 OpenAPI 导入脚本自动分组生成，模块：${moduleName}`,
        type: TaskType.INTERFACE_TEST,
        executeType: ExecuteType.IMMEDIATE,
        executeEnvironments,
        environmentId: payload.environmentId,
        scriptIds: moduleScripts.map((item) => item.id),
        priority: payload.priority || TaskPriority.MEDIUM,
        remarks: marker,
        triggerType: payload.triggerType,
        triggerUrl: payload.triggerUrl,
        createdBy: userId,
      });
      createdTasks.push(await this.testTaskRepository.save(task));
    }

    return {
      totalModules: grouped.size,
      createdTasks: createdTasks.length,
      skippedModules,
      existingTasks,
      tasks: createdTasks,
    };
  }

  private async attachExistingCaseFlags(projectId: string, operations: OpenApiOperation[]): Promise<OpenApiOperation[]> {
    const existingMap = await this.loadExistingOpenApiCaseMap(projectId);
    return operations.map((item) => {
      const marker = this.buildOpenApiCaseMarker(item.key);
      const existingCaseId = existingMap.get(marker);
      return {
        ...item,
        existsInProject: Boolean(existingCaseId),
        existingCaseId,
      };
    });
  }

  private async loadExistingOpenApiCaseMap(projectId: string): Promise<Map<string, string>> {
    const list = await this.testCaseRepository.find({
      where: {
        projectId,
        type: TestCaseType.INTERFACE,
      },
      select: ['id', 'name', 'remarks', 'testSteps'],
      take: 5000,
      order: { createdAt: 'DESC' },
    });

    const result = new Map<string, string>();
    for (const item of list) {
      if (item.remarks?.startsWith('openapiKey:')) {
        result.set(this.buildOpenApiCaseMarker(item.remarks.replace(/^openapiKey:/, '')), item.id);
      }
      const fallbackMarker = this.buildOpenApiCaseMarker(item.name);
      if (!result.has(fallbackMarker)) {
        result.set(fallbackMarker, item.id);
      }

      const operationKey = this.extractOperationKeyFromTestSteps(item.testSteps);
      if (operationKey) {
        const stepMarker = this.buildOpenApiCaseMarker(operationKey);
        if (!result.has(stepMarker)) {
          result.set(stepMarker, item.id);
        }
      }
    }
    return result;
  }

  private buildOpenApiCaseMarker(key: string): string {
    const text = String(key || '').trim().replace(/\s+/g, ' ');
    const matched = text.match(/^([a-zA-Z]+)\s+(.+)$/);
    if (!matched) {
      return `openapiKey:${text}`;
    }
    return `openapiKey:${matched[1].toUpperCase()} ${matched[2].trim()}`;
  }

  private extractOperationKeyFromTestSteps(testSteps?: string): string {
    const text = String(testSteps || '');
    const match = text.match(/按\s+([A-Za-z]+\s+\/\S+)\s+发起请求/);
    return match ? match[1].trim() : '';
  }

  private async extractOpenApiOperations(payload: OpenApiPreviewDto): Promise<OpenApiOperation[]> {
    const document = await this.loadOpenApiDocument(payload);
    const paths = document?.paths;
    if (!paths || typeof paths !== 'object') {
      throw new BadRequestException('OpenAPI 文档缺少 paths 字段');
    }

    const maxOperations = Math.max(1, Math.min(500, Number(payload.maxOperations) || 100));
    const operations: OpenApiOperation[] = [];
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

    for (const [path, methodMap] of Object.entries(paths)) {
      if (!methodMap || typeof methodMap !== 'object') continue;
      for (const method of methods) {
        const operation: any = (methodMap as any)[method];
        if (!operation || typeof operation !== 'object') continue;
        const key = `${method.toUpperCase()} ${path}`;
        const responseStatus = Object.keys(operation.responses || {})[0] || '200';
        operations.push({
          key,
          path,
          method: method.toUpperCase(),
          summary: operation.summary || '',
          description: operation.description || '',
          tags: Array.isArray(operation.tags) ? operation.tags : [],
          requestExample: this.extractRequestExample(operation),
          responseStatus,
        });
        if (operations.length >= maxOperations) {
          return operations;
        }
      }
    }

    if (!operations.length) {
      throw new BadRequestException('OpenAPI 文档中未解析到可导入接口');
    }

    return operations;
  }

  private async loadOpenApiDocument(payload: OpenApiPreviewDto): Promise<any> {
    let rawContent = '';
    if (payload.sourceType === OpenApiSourceType.URL) {
      if (!payload.url) {
        throw new BadRequestException('sourceType=url 时 url 必填');
      }
      const res = await axios.get(payload.url, { timeout: 15000 });
      rawContent = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } else {
      rawContent = payload.rawContent || '';
    }

    if (!rawContent.trim()) {
      throw new BadRequestException('OpenAPI 内容为空');
    }

    try {
      return JSON.parse(rawContent);
    } catch {
      try {
        const parsed = parseYaml(rawContent);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('invalid yaml');
        }
        return parsed;
      } catch {
        throw new BadRequestException('OpenAPI 文档解析失败，仅支持 JSON 或 YAML 格式');
      }
    }
  }

  private extractRequestExample(operation: any) {
    const requestBody = operation?.requestBody;
    const content = requestBody?.content;
    if (!content || typeof content !== 'object') return {};
    const contentItem = content['application/json'] || Object.values(content)[0];
    if (!contentItem || typeof contentItem !== 'object') return {};
    if (contentItem.example && typeof contentItem.example === 'object') return contentItem.example;
    if (contentItem.examples && typeof contentItem.examples === 'object') {
      const first: any = Object.values(contentItem.examples)[0];
      if (first?.value && typeof first.value === 'object') return first.value;
    }
    return {};
  }

  private buildImportedScript(operation: OpenApiOperation, baseUrl: string, defaultHeaders: Record<string, any>): string {
    const fnName = `${operation.method}_${operation.path}`
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
    const body = JSON.stringify(operation.requestExample || {}, null, 2);
    const headersJson = JSON.stringify({ 'Content-Type': 'application/json', ...defaultHeaders }, null, 2);

    return `import requests

def test_${fnName}():
    base_url = "${baseUrl}"
    url = f"{base_url}${operation.path}"
    headers = ${headersJson}
    payload = ${body}

    response = requests.request("${operation.method}", url, headers=headers, json=payload)
    assert response.status_code == ${Number(operation.responseStatus) || 200}

if __name__ == "__main__":
    test_${fnName}()
`;
  }

  private normalizeBaseUrl(value?: string): string {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.replace(/\/+$/, '');
  }

  private normalizeDefaultHeaders(value?: Record<string, any>): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const result: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) {
      const k = String(key || '').trim();
      if (!k) continue;
      result[k] = item;
    }
    return result;
  }
}
