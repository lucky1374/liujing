import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DefectType, DefectSeverity, DefectStatus } from '../entities/defect.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateDefectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DefectType })
  @IsEnum(DefectType)
  type: DefectType;

  @ApiProperty({ enum: DefectSeverity })
  @IsEnum(DefectSeverity)
  severity: DefectSeverity;

  @ApiPropertyOptional({ enum: DefectStatus })
  @IsOptional()
  @IsEnum(DefectStatus)
  status?: DefectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stepsToReproduce?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actualResult?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedResult?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedCaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedScriptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedTaskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  environment?: string;
}

export class UpdateDefectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DefectStatus })
  @IsOptional()
  @IsEnum(DefectStatus)
  status?: DefectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jiraKey?: string;
}

export class QueryDefectDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedTaskId?: string;

  @ApiPropertyOptional({ enum: DefectStatus })
  @IsOptional()
  @IsEnum(DefectStatus)
  status?: DefectStatus;

  @ApiPropertyOptional({ enum: DefectSeverity })
  @IsOptional()
  @IsEnum(DefectSeverity)
  severity?: DefectSeverity;

  @ApiPropertyOptional({ enum: DefectType })
  @IsOptional()
  @IsEnum(DefectType)
  type?: DefectType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;
}
