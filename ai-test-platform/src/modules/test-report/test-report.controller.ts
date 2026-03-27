import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestReportService } from './test-report.service';
import { CreateTestReportDto, QueryTestReportDto } from './dto/test-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('测试报告')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-reports')
export class TestReportController {
  constructor(private readonly reportService: TestReportService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '创建测试报告' })
  create(@Body() createDto: CreateTestReportDto, @Request() req: any) {
    return this.reportService.create(createDto, req.user.userId);
  }

  @Post('generate-by-ai')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: 'AI生成测试报告' })
  generateByAi(@Body('taskId') taskId: string, @Request() req: any) {
    return this.reportService.generateByAi(taskId, req.user.userId);
  }

  @Get()
  @ApiOperation({ description: '获取报告列表' })
  findAll(@Query() query: QueryTestReportDto) {
    return this.reportService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ description: '获取报告详情' })
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ description: '删除报告' })
  remove(@Param('id') id: string) {
    return this.reportService.remove(id);
  }
}
