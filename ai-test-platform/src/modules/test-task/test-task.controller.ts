import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestTaskService } from './test-task.service';
import { TestExecutionService } from './test-execution.service';
import { CreateTestTaskDto, UpdateTestTaskDto, QueryTestTaskDto, ExecuteTaskDto } from './dto/test-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('测试任务')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-tasks')
export class TestTaskController {
  constructor(
    private readonly taskService: TestTaskService,
    private readonly executionService: TestExecutionService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '创建测试任务' })
  create(@Body() createDto: CreateTestTaskDto, @Request() req: any) {
    return this.taskService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ description: '获取任务列表' })
  findAll(@Query() query: QueryTestTaskDto) {
    return this.taskService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ description: '获取任务统计' })
  getStatistics(@Query('projectId') projectId?: string) {
    return this.taskService.getStatistics(projectId);
  }

  @Get('runner/diagnostics')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '诊断 Python Runner 连接状态' })
  diagnoseRunner() {
    return this.executionService.diagnosePythonRunner();
  }

  @Get(':id')
  @ApiOperation({ description: '获取任务详情' })
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '更新任务' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTestTaskDto) {
    return this.taskService.update(id, updateDto);
  }

  @Post(':id/execute')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '执行测试任务' })
  execute(@Param('id') id: string, @Body() executeDto: ExecuteTaskDto) {
    return this.executionService.executeTask(id, executeDto.environment, executeDto.environmentId);
  }

  @Get(':id/executions')
  @ApiOperation({ description: '获取任务执行记录' })
  findExecutions(@Param('id') id: string) {
    return this.executionService.findExecutions(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '删除任务' })
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }
}
