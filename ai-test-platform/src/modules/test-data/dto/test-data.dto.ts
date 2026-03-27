import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DataType, TestDataStatus } from '../entities/test-data.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateTestDataDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DataType })
  @IsEnum(DataType)
  type: DataType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiProperty()
  @IsString()
  dataContent: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataSchema?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sensitiveFields?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReusable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: TestDataStatus })
  @IsOptional()
  @IsEnum(TestDataStatus)
  status?: TestDataStatus;
}

export class UpdateTestDataDto {
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
  dataContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataSchema?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sensitiveFields?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isReusable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: TestDataStatus })
  @IsOptional()
  @IsEnum(TestDataStatus)
  status?: TestDataStatus;
}

export class QueryTestDataDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ enum: DataType })
  @IsOptional()
  @IsEnum(DataType)
  type?: DataType;

  @ApiPropertyOptional({ enum: TestDataStatus })
  @IsOptional()
  @IsEnum(TestDataStatus)
  status?: TestDataStatus;
}
