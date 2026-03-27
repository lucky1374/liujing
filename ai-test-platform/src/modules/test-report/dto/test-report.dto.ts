import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType } from '../entities/test-report.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateTestReportDto {
  @ApiPropertyOptional({ description: '项目ID' })
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

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedTaskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedModule?: string;
}

export class QueryTestReportDto extends PaginationDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '关联任务ID' })
  @IsOptional()
  @IsString()
  relatedTaskId?: string;

  @ApiPropertyOptional({ enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;
}
