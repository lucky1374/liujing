import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { IntegrationScenarioStatus } from '../entities/integration-scenario.entity';
import {
  IntegrationScenarioTemplateLifecycleStatus,
  IntegrationScenarioTemplateStatus,
} from '../entities/integration-scenario-template.entity';

export enum ScenarioAssertionSource {
  RESPONSE_STATUS = 'response.status',
  RESPONSE_BODY = 'response.body',
  RESPONSE_HEADERS = 'response.headers',
  VARIABLES = 'vars',
}

export enum ScenarioAssertionOperator {
  EQ = 'eq',
  CONTAINS = 'contains',
  EXISTS = 'exists',
  REGEX = 'regex',
}

export enum ScenarioPathType {
  DOT = 'dot',
  JSONPATH = 'jsonpath',
}

export enum ScenarioExtractorSource {
  RESPONSE_BODY = 'response.body',
  RESPONSE_HEADERS = 'response.headers',
  RESPONSE_STATUS = 'response.status',
}

export class ScenarioStepExtractorDto {
  @ApiProperty({ description: '变量名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ScenarioExtractorSource, description: '提取来源' })
  @IsEnum(ScenarioExtractorSource)
  source: ScenarioExtractorSource;

  @ApiPropertyOptional({ description: '提取路径，如 data.token；source=response.status 时可省略' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ enum: ScenarioPathType, default: ScenarioPathType.DOT, description: '路径类型（dot/jsonpath）' })
  @IsOptional()
  @IsEnum(ScenarioPathType)
  pathType?: ScenarioPathType;

  @ApiPropertyOptional({ description: '正则表达式（可选），用于二次提取字符串中的子串' })
  @IsOptional()
  @IsString()
  regex?: string;

  @ApiPropertyOptional({ description: '正则分组下标，默认 0（完整匹配）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  regexGroup?: number;

  @ApiPropertyOptional({ description: '提取失败时默认值' })
  @IsOptional()
  defaultValue?: unknown;
}

export class ScenarioStepAssertionDto {
  @ApiProperty({ enum: ScenarioAssertionSource, description: '断言数据来源' })
  @IsEnum(ScenarioAssertionSource)
  source: ScenarioAssertionSource;

  @ApiPropertyOptional({ description: '路径，如 data.code；source=response.status 时可省略' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ enum: ScenarioPathType, default: ScenarioPathType.DOT, description: '路径类型（dot/jsonpath）' })
  @IsOptional()
  @IsEnum(ScenarioPathType)
  pathType?: ScenarioPathType;

  @ApiProperty({ enum: ScenarioAssertionOperator, description: '断言操作符' })
  @IsEnum(ScenarioAssertionOperator)
  operator: ScenarioAssertionOperator;

  @ApiPropertyOptional({ description: '期望值（operator=exists 时可省略）' })
  @IsOptional()
  expected?: unknown;
}

export class ScenarioStepBranchRuleDto {
  @ApiProperty({ enum: ScenarioAssertionSource, description: '分支判定数据来源' })
  @IsEnum(ScenarioAssertionSource)
  source: ScenarioAssertionSource;

  @ApiPropertyOptional({ description: '路径，如 data.code；source=response.status 时可省略' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ enum: ScenarioPathType, default: ScenarioPathType.DOT, description: '路径类型（dot/jsonpath）' })
  @IsOptional()
  @IsEnum(ScenarioPathType)
  pathType?: ScenarioPathType;

  @ApiProperty({ enum: ScenarioAssertionOperator, description: '判定操作符' })
  @IsEnum(ScenarioAssertionOperator)
  operator: ScenarioAssertionOperator;

  @ApiPropertyOptional({ description: '期望值（operator=exists 时可省略）' })
  @IsOptional()
  expected?: unknown;

  @ApiProperty({ description: '匹配后跳转到的步骤下标（从0开始）' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  nextStepIndex: number;
}

export class ScenarioStepDto {
  @ApiProperty({ description: '步骤名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'HTTP 方法，如 GET/POST/PUT/DELETE' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ description: '请求 URL，支持 {{var}} 模板' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '请求头，支持 {{var}} 模板' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Query 参数，支持 {{var}} 模板' })
  @IsOptional()
  @IsObject()
  query?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '请求体，支持 {{var}} 模板' })
  @IsOptional()
  body?: unknown;

  @ApiPropertyOptional({ description: '步骤超时时间（毫秒）', default: 30000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(120000)
  timeoutMs?: number;

  @ApiPropertyOptional({ type: [ScenarioStepExtractorDto], description: '变量提取规则' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioStepExtractorDto)
  extractors?: ScenarioStepExtractorDto[];

  @ApiPropertyOptional({ type: [ScenarioStepAssertionDto], description: '断言规则' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioStepAssertionDto)
  assertions?: ScenarioStepAssertionDto[];

  @ApiPropertyOptional({ description: '断言失败后是否继续后续步骤', default: false })
  @IsOptional()
  @IsBoolean()
  continueOnFailure?: boolean;

  @ApiPropertyOptional({ description: '通过后跳转到的步骤下标（从0开始）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  onPassedStepIndex?: number;

  @ApiPropertyOptional({ description: '失败后跳转到的步骤下标（从0开始）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  onFailedStepIndex?: number;

  @ApiPropertyOptional({ type: [ScenarioStepBranchRuleDto], description: '分支规则（按顺序命中第一条）' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioStepBranchRuleDto)
  branchRules?: ScenarioStepBranchRuleDto[];
}

export class CreateIntegrationScenarioDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: '场景名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '场景描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: IntegrationScenarioStatus, default: IntegrationScenarioStatus.DRAFT })
  @IsOptional()
  @IsEnum(IntegrationScenarioStatus)
  status?: IntegrationScenarioStatus;

  @ApiProperty({ type: [ScenarioStepDto], description: '场景步骤（按数组顺序串行执行）' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioStepDto)
  steps: ScenarioStepDto[];

  @ApiPropertyOptional({ description: '默认变量（执行时可被覆盖）' })
  @IsOptional()
  @IsObject()
  defaultVariables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '来源模板Key（系统内部使用）' })
  @IsOptional()
  @IsString()
  sourceTemplateKey?: string;
}

export class UpdateIntegrationScenarioDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '场景名称' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: '场景描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: IntegrationScenarioStatus })
  @IsOptional()
  @IsEnum(IntegrationScenarioStatus)
  status?: IntegrationScenarioStatus;

  @ApiPropertyOptional({ type: [ScenarioStepDto], description: '场景步骤（按数组顺序串行执行）' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioStepDto)
  steps?: ScenarioStepDto[];

  @ApiPropertyOptional({ description: '默认变量（执行时可被覆盖）' })
  @IsOptional()
  @IsObject()
  defaultVariables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '来源模板Key（系统内部使用）' })
  @IsOptional()
  @IsString()
  sourceTemplateKey?: string;
}

export class ExecuteIntegrationScenarioDto {
  @ApiPropertyOptional({ description: '本次执行临时变量（覆盖 defaultVariables）' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}

export class QueryIntegrationScenarioDto extends PaginationDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: IntegrationScenarioStatus })
  @IsOptional()
  @IsEnum(IntegrationScenarioStatus)
  status?: IntegrationScenarioStatus;

  @ApiPropertyOptional({ description: '场景名称（模糊匹配）' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class QueryScenarioExecutionDto extends PaginationDto {}

export class CreateScenarioFromTemplateDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '场景名称（默认模板名称）' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '场景描述（默认模板描述）' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: IntegrationScenarioStatus, default: IntegrationScenarioStatus.DRAFT })
  @IsOptional()
  @IsEnum(IntegrationScenarioStatus)
  status?: IntegrationScenarioStatus;

  @ApiPropertyOptional({ description: '模板变量覆盖（合并到模板默认变量）' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}

export class ScenarioTemplateItemDto {
  @ApiProperty({ description: '模板唯一key' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: '模板名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '模板分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '模板版本', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: '默认变量' })
  @IsOptional()
  @IsObject()
  defaultVariables?: Record<string, unknown>;

  @ApiProperty({ type: [ScenarioStepDto], description: '模板步骤' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioStepDto)
  steps: ScenarioStepDto[];
}

export class ImportScenarioTemplatesDto {
  @ApiProperty({ type: [ScenarioTemplateItemDto], description: '待导入模板列表' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioTemplateItemDto)
  templates: ScenarioTemplateItemDto[];

  @ApiPropertyOptional({ description: '是否覆盖同key模板', default: true })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class ReviewScenarioTemplateDto {
  @ApiProperty({ enum: ['approve', 'reject'], description: '审核动作' })
  @IsString()
  @IsNotEmpty()
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ description: '审核备注' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class QueryScenarioTemplateDto extends PaginationDto {
  @ApiPropertyOptional({ enum: IntegrationScenarioTemplateStatus, description: '模板状态' })
  @IsOptional()
  @IsEnum(IntegrationScenarioTemplateStatus)
  status?: IntegrationScenarioTemplateStatus;
}

export class QueryTemplateAuditDto extends PaginationDto {}

export class QueryTemplateAuditDiffDto {
  @ApiPropertyOptional({ description: '左侧审计日志ID（可选，默认取最近一条）' })
  @IsOptional()
  @IsString()
  leftLogId?: string;

  @ApiPropertyOptional({ description: '右侧审计日志ID（可选，默认取第二近一条）' })
  @IsOptional()
  @IsString()
  rightLogId?: string;
}

export class UpdateQualityPolicyDto {
  @ApiPropertyOptional({ description: '策略描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '结构权重（0-1）' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  structure: number;

  @ApiProperty({ description: '断言权重（0-1）' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  assertions: number;

  @ApiProperty({ description: '变量依赖权重（0-1）' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  variableDependency: number;

  @ApiProperty({ description: '可维护性权重（0-1）' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  maintainability: number;
}

export class UpdateTemplateLifecycleDto {
  @ApiProperty({ enum: IntegrationScenarioTemplateLifecycleStatus, description: '生命周期状态' })
  @IsEnum(IntegrationScenarioTemplateLifecycleStatus)
  lifecycleStatus: IntegrationScenarioTemplateLifecycleStatus;

  @ApiPropertyOptional({ description: '生命周期备注（废弃/归档原因）' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class NotifyTemplateLifecycleDto {
  @ApiPropertyOptional({ description: 'Webhook地址列表；不传则读取环境变量 LIFECYCLE_NOTIFY_WEBHOOK_URLS（逗号分隔）' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  webhookUrls?: string[];

  @ApiPropertyOptional({ description: '通知邮箱列表；不传则读取环境变量 LIFECYCLE_NOTIFY_EMAILS（逗号分隔）' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emails?: string[];

  @ApiPropertyOptional({ description: '是否仅预览不发送', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class UpdateGovernanceRuleDto {
  @ApiPropertyOptional({ description: '规则说明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用规则', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '是否启用待审核超时自动驳回', default: true })
  @IsOptional()
  @IsBoolean()
  autoRejectPendingReviewEnabled?: boolean;

  @ApiPropertyOptional({ description: '待审核超时天数阈值', default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  pendingReviewTimeoutDays?: number;

  @ApiPropertyOptional({ description: '是否启用驳回后超时自动废弃', default: true })
  @IsOptional()
  @IsBoolean()
  autoDeprecatedRejectedEnabled?: boolean;

  @ApiPropertyOptional({ description: '驳回后未处理天数阈值', default: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  rejectedNotFixedDays?: number;

  @ApiPropertyOptional({ description: '是否启用审核通过自动发布', default: false })
  @IsOptional()
  @IsBoolean()
  autoReleaseApprovedEnabled?: boolean;

  @ApiPropertyOptional({ description: '是否启用低质量自动废弃', default: false })
  @IsOptional()
  @IsBoolean()
  autoDeprecatedLowQualityEnabled?: boolean;

  @ApiPropertyOptional({ description: '低质量分阈值（0-100）', default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  lowQualityThreshold?: number;
}

export class ExecuteGovernanceRulesDto {
  @ApiPropertyOptional({ description: '按业务线执行；不传则执行全部' })
  @IsOptional()
  @IsString()
  businessLine?: string;

  @ApiPropertyOptional({ description: '仅预览不实际执行', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class QueryGovernanceExecutionDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按业务线筛选（模板category）' })
  @IsOptional()
  @IsString()
  businessLine?: string;

  @ApiPropertyOptional({ description: '最近天数', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  days?: number;
}
