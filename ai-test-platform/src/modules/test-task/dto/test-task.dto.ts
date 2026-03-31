import { IsString, IsOptional, IsEnum, IsArray, IsDateString, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, TaskStatus, TaskPriority, ExecuteType, ExecuteEnvironment } from '../entities/test-task.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateTestTaskDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskType })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({ enum: ExecuteType })
  @IsEnum(ExecuteType)
  executeType: ExecuteType;

  @ApiProperty({ enum: ExecuteEnvironment, isArray: true })
  @IsArray()
  executeEnvironments: ExecuteEnvironment[];

  @ApiPropertyOptional({ description: '默认执行环境ID' })
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional({ description: '关联脚本ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  scriptIds?: string[];

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiPropertyOptional({ description: '触发类型（如 webhook）' })
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiPropertyOptional({ description: '回调地址（triggerType=webhook 时生效）' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  triggerUrl?: string;
}

export class UpdateTestTaskDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({ enum: ExecuteType })
  @IsOptional()
  @IsEnum(ExecuteType)
  executeType?: ExecuteType;

  @ApiPropertyOptional({ enum: ExecuteEnvironment, isArray: true })
  @IsOptional()
  @IsArray()
  executeEnvironments?: ExecuteEnvironment[];

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ description: '默认执行环境ID' })
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional({ description: '关联脚本ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  scriptIds?: string[];

  @ApiPropertyOptional({ description: '触发类型（如 webhook）' })
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiPropertyOptional({ description: '回调地址（triggerType=webhook 时生效）' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  triggerUrl?: string;
}

export class QueryTestTaskDto extends PaginationDto {
  @ApiPropertyOptional({ description: '任务ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '任务ID列表（逗号分隔）' })
  @IsOptional()
  @IsString()
  taskIds?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

export class ExecuteTaskDto {
  @ApiPropertyOptional({ description: '执行环境ID' })
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiProperty({ description: '执行环境', enum: ExecuteEnvironment })
  @IsOptional()
  @IsEnum(ExecuteEnvironment)
  environment?: ExecuteEnvironment;
}
