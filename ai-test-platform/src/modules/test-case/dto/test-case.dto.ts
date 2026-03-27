import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestCasePriority, TestCaseStatus, TestCaseSource, TestCaseType } from '../entities/test-case.entity';
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
