import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnvironmentType, EnvironmentStatus } from '../entities/environment.entity';

export class CreateEnvironmentDto {
  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: EnvironmentType })
  @IsEnum(EnvironmentType)
  type: EnvironmentType;

  @ApiProperty()
  @IsString()
  baseUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headers?: Record<string, any>;
}

export class UpdateEnvironmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: EnvironmentType })
  @IsOptional()
  @IsEnum(EnvironmentType)
  type?: EnvironmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headers?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, any>;

  @ApiPropertyOptional({ enum: EnvironmentStatus })
  @IsOptional()
  @IsEnum(EnvironmentStatus)
  status?: EnvironmentStatus;
}
