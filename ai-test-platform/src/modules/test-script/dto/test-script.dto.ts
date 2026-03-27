import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScriptType, ScriptLanguage, ScriptStatus, ScriptExecutionMode } from '../entities/test-script.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateTestScriptDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '关联用例ID' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ScriptType })
  @IsEnum(ScriptType)
  type: ScriptType;

  @ApiProperty({ enum: ScriptLanguage })
  @IsEnum(ScriptLanguage)
  language: ScriptLanguage;

  @ApiPropertyOptional({ enum: ScriptExecutionMode, description: '执行模式' })
  @IsOptional()
  @IsEnum(ScriptExecutionMode)
  executionMode?: ScriptExecutionMode;

  @ApiProperty()
  @IsString()
  scriptContent: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  framework?: string;
}

export class UpdateTestScriptDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '关联用例ID' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ScriptType })
  @IsOptional()
  @IsEnum(ScriptType)
  type?: ScriptType;

  @ApiPropertyOptional({ enum: ScriptLanguage })
  @IsOptional()
  @IsEnum(ScriptLanguage)
  language?: ScriptLanguage;

  @ApiPropertyOptional({ enum: ScriptExecutionMode, description: '执行模式' })
  @IsOptional()
  @IsEnum(ScriptExecutionMode)
  executionMode?: ScriptExecutionMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scriptContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ScriptStatus)
  status?: ScriptStatus;
}

export class QueryTestScriptDto extends PaginationDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ enum: ScriptType })
  @IsOptional()
  @IsEnum(ScriptType)
  type?: ScriptType;

  @ApiPropertyOptional({ enum: ScriptStatus })
  @IsOptional()
  @IsEnum(ScriptStatus)
  status?: ScriptStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;
}
