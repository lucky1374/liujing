import { IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ProjectStatus } from '../entities/project.entity';

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '项目编码' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: '业务线' })
  @IsOptional()
  @IsString()
  businessLine?: string;

  @ApiPropertyOptional({ description: '负责人ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, description: '项目状态' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessLine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

export class QueryProjectDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: '关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class UpdateReleaseGateSettingsDto {
  @ApiPropertyOptional({ description: '发布通过率阈值(%)，默认95' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  minPassRate?: number;

  @ApiPropertyOptional({ description: 'AI高置信采纳率阈值(%)，默认50' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minAiAdoptionRate?: number;

  @ApiPropertyOptional({ description: 'AI门禁最小样本量，默认5' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  minAiSampleSize?: number;

  @ApiPropertyOptional({ description: '阈值变更原因备注（可选）' })
  @IsOptional()
  @IsString()
  changeReason?: string;

  @ApiPropertyOptional({ description: '整改单默认负责人（项目级）' })
  @IsOptional()
  @IsString()
  rectificationOwnerDefault?: string;

  @ApiPropertyOptional({ description: '整改单默认优先级（项目级）', enum: ['P0', 'P1', 'P2'] })
  @IsOptional()
  @IsIn(['P0', 'P1', 'P2'])
  rectificationPriorityDefault?: 'P0' | 'P1' | 'P2';

  @ApiPropertyOptional({ description: '整改单默认标签列表（项目级）', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rectificationTagsDefault?: string[];
}

export class QueryReleaseGateAuditDto {
  @ApiPropertyOptional({ description: '返回条数，默认20，最大100' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
