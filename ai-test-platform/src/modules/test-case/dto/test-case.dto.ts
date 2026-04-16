import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, ArrayMinSize, IsInt, Min, Max, IsObject, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestCasePriority, TestCaseStatus, TestCaseSource, TestCaseType } from '../entities/test-case.entity';
import { ExecuteEnvironment, TaskPriority } from '../../test-task/entities/test-task.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateTestCaseDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: '用例名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '用例描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '前置条件' })
  @IsString()
  preconditions: string;

  @ApiProperty({ description: '测试步骤' })
  @IsString()
  testSteps: string;

  @ApiProperty({ description: '预期结果' })
  @IsString()
  expectedResult: string;

  @ApiPropertyOptional({ description: '所属模块' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: '子模块' })
  @IsOptional()
  @IsString()
  subModule?: string;

  @ApiPropertyOptional({ enum: TestCaseType })
  @IsOptional()
  @IsEnum(TestCaseType)
  type?: TestCaseType;

  @ApiPropertyOptional({ enum: TestCasePriority })
  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCoreCase?: boolean;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsString()
  tags?: string;
}

export class UpdateTestCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preconditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testSteps?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedResult?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCoreCase?: boolean;
}

export class QueryTestCaseDto extends PaginationDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ enum: TestCasePriority })
  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @ApiPropertyOptional({ enum: TestCaseStatus })
  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  @ApiPropertyOptional({ enum: TestCaseSource })
  @IsOptional()
  @IsEnum(TestCaseSource)
  source?: TestCaseSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;
}

export enum OpenApiSourceType {
  URL = 'url',
  JSON = 'json',
}

export enum OpenApiImportMode {
  SKIP = 'skip',
  UPSERT = 'upsert',
}

export class OpenApiPreviewDto {
  @ApiPropertyOptional({ description: '所属项目ID（用于重复检测）' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ enum: OpenApiSourceType, description: 'OpenAPI来源类型' })
  @IsEnum(OpenApiSourceType)
  sourceType: OpenApiSourceType;

  @ApiPropertyOptional({ description: 'OpenAPI文档URL（sourceType=url时必填）' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'OpenAPI JSON内容（sourceType=json时必填）' })
  @IsOptional()
  @IsString()
  rawContent?: string;

  @ApiPropertyOptional({ description: '默认模块名' })
  @IsOptional()
  @IsString()
  moduleName?: string;

  @ApiPropertyOptional({ description: '导入脚本默认网关地址（例如 https://api.example.com）' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: '导入脚本默认请求头模板（JSON对象）', type: Object })
  @IsOptional()
  @IsObject()
  defaultHeaders?: Record<string, any>;

  @ApiPropertyOptional({ description: '最多预览接口数，默认100，最大500' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxOperations?: number;
}

export class OpenApiImportDto extends OpenApiPreviewDto {
  @ApiProperty({ description: '所属项目ID' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ description: '仅导入指定接口，格式 METHOD /path', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedOperations?: string[];

  @ApiPropertyOptional({
    description: '导入项覆盖配置',
    type: [Object],
    example: [
      {
        key: 'POST /api/users',
        caseName: '用户创建-正常流程',
        moduleName: '用户中心',
        priority: 'high',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  operationOverrides?: Array<{
    key: string;
    caseName?: string;
    moduleName?: string;
    priority?: TestCasePriority;
  }>;

  @ApiPropertyOptional({ description: '是否同时创建测试脚本，默认true' })
  @IsOptional()
  @IsBoolean()
  createScripts?: boolean;

  @ApiPropertyOptional({ description: '遇到已存在接口用例时是否跳过，默认true' })
  @IsOptional()
  @IsBoolean()
  skipExisting?: boolean;

  @ApiPropertyOptional({ enum: OpenApiImportMode, description: '导入模式：skip 跳过已存在，upsert 覆盖更新已存在' })
  @IsOptional()
  @IsEnum(OpenApiImportMode)
  importMode?: OpenApiImportMode;
}

export class CreateTasksFromImportedScriptsDto {
  @ApiProperty({ description: '项目ID' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ description: '按模块创建任务，默认使用全部模块', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @ApiPropertyOptional({ description: '任务名前缀' })
  @IsOptional()
  @IsString()
  taskPrefix?: string;

  @ApiPropertyOptional({ enum: ExecuteEnvironment, isArray: true, description: '执行环境，默认 test' })
  @IsOptional()
  @IsArray()
  @IsEnum(ExecuteEnvironment, { each: true })
  executeEnvironments?: ExecuteEnvironment[];

  @ApiPropertyOptional({ enum: TaskPriority, description: '任务优先级，默认 medium' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: '默认执行环境ID' })
  @IsOptional()
  @IsString()
  environmentId?: string;

  @ApiPropertyOptional({ description: '是否跳过已存在同模块自动任务，默认 true' })
  @IsOptional()
  @IsBoolean()
  skipExistingTasks?: boolean;

  @ApiPropertyOptional({ description: '任务触发类型（如 webhook）' })
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiPropertyOptional({ description: '任务回调地址（triggerType=webhook 时生效）' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  triggerUrl?: string;
}
