import { IsEnum, IsOptional, IsString } from 'class-validator';
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
