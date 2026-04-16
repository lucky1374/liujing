import { TestCaseService } from './test-case.service';
import { OpenApiImportMode } from './dto/test-case.dto';
import { TestCasePriority, TestCaseSource, TestCaseStatus, TestCaseType } from './entities/test-case.entity';
import { ScriptExecutionMode, ScriptLanguage, ScriptSource, ScriptStatus, ScriptType } from '../test-script/entities/test-script.entity';

const makeRepo = () => ({
  create: jest.fn((v) => v),
  save: jest.fn(async (v) => v),
  findOne: jest.fn(),
  find: jest.fn(),
});

describe('TestCaseService OpenAPI import mode', () => {
  let service: TestCaseService;
  let testCaseRepo: ReturnType<typeof makeRepo>;
  let testScriptRepo: ReturnType<typeof makeRepo>;
  let testTaskRepo: ReturnType<typeof makeRepo>;

  const operation = {
    key: 'POST /api/users',
    path: '/api/users',
    method: 'POST',
    summary: 'create user',
    description: 'create user by api',
    tags: ['users'],
    requestExample: { name: 'demo' },
    responseStatus: '200',
  };

  beforeEach(() => {
    testCaseRepo = makeRepo();
    testScriptRepo = makeRepo();
    testTaskRepo = makeRepo();
    service = new TestCaseService(testCaseRepo as any, testScriptRepo as any, testTaskRepo as any, {} as any);

    jest.spyOn(service as any, 'extractOpenApiOperations').mockResolvedValue([operation]);
  });

  it('skips existing operation in skip mode', async () => {
    jest.spyOn(service as any, 'loadExistingOpenApiCaseMap').mockResolvedValue(
      new Map([['openapiKey:POST /api/users', 'case-1']]),
    );

    const result = await service.importOpenApi(
      {
        projectId: 'p1',
        sourceType: 'json' as any,
        rawContent: '{}',
        importMode: OpenApiImportMode.SKIP,
        createScripts: true,
      },
      'u1',
    );

    expect(result.createdCount).toBe(0);
    expect(result.updatedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.skippedExistingCount).toBe(1);
    expect(testCaseRepo.save).not.toHaveBeenCalled();
    expect(testScriptRepo.save).not.toHaveBeenCalled();
  });

  it('updates existing case and imported script in upsert mode', async () => {
    jest.spyOn(service as any, 'loadExistingOpenApiCaseMap').mockResolvedValue(
      new Map([['openapiKey:POST /api/users', 'case-1']]),
    );

    const existingCase = {
      id: 'case-1',
      projectId: 'p1',
      name: 'old name',
      description: 'old desc',
      preconditions: 'old pre',
      testSteps: 'old steps',
      expectedResult: 'old expect',
      module: 'old-module',
      priority: TestCasePriority.LOW,
      type: TestCaseType.INTERFACE,
      source: TestCaseSource.IMPORTED,
      status: TestCaseStatus.DRAFT,
      remarks: 'openapiKey:POST /api/users',
      createdBy: 'u0',
      updatedBy: '',
    };

    const existingScript = {
      id: 'script-1',
      caseId: 'case-1',
      name: 'old script',
      description: 'old script desc',
      module: 'old-module',
      source: ScriptSource.IMPORTED,
      type: ScriptType.INTERFACE,
      language: ScriptLanguage.PYTHON,
      executionMode: ScriptExecutionMode.LITE,
      status: ScriptStatus.VALID,
      scriptContent: 'old content',
      createdBy: 'u0',
      updatedBy: '',
    };

    testCaseRepo.findOne.mockResolvedValue(existingCase);
    testScriptRepo.findOne.mockResolvedValue(existingScript);

    const result = await service.importOpenApi(
      {
        projectId: 'p1',
        sourceType: 'json' as any,
        rawContent: '{}',
        importMode: OpenApiImportMode.UPSERT,
        createScripts: true,
      },
      'u1',
    );

    expect(result.createdCount).toBe(0);
    expect(result.updatedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.importedCases).toBe(1);
    expect(result.importedScripts).toBe(1);

    expect(existingCase.name).toBe('POST /api/users');
    expect(existingCase.module).toBe('users');
    expect(existingCase.updatedBy).toBe('u1');

    expect(existingScript.name).toBe('POST /api/users - 导入脚本');
    expect(existingScript.updatedBy).toBe('u1');
    expect(String(existingScript.scriptContent)).toContain('/api/users');
  });
});
