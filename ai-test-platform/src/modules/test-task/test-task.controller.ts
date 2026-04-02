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

  @Get('observability/overview')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取执行观测概览' })
  getObservabilityOverview(@Query('hours') hours?: string) {
    return this.executionService.getObservabilityOverview(hours ? Number(hours) : 24);
  }

  @Get('observability/failure-reason-task-ids')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '按失败原因查询任务ID列表' })
  getTaskIdsByFailureReason(@Query('reason') reason: string, @Query('hours') hours?: string) {
    return this.executionService.getTaskIdsByFailureReason(reason, hours ? Number(hours) : 24);
  }

  @Get('observability/callback-alerts')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取回调告警概览' })
  getCallbackAlerts(@Query('projectId') projectId?: string, @Query('limit') limit?: string) {
    return this.executionService.getCallbackAlertOverview(projectId, limit ? Number(limit) : 10);
  }

  @Get('observability/notifications')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取站内告警通知列表' })
  getAlertNotifications(
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.executionService.findAlertNotifications({
      projectId,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      unreadOnly: String(unreadOnly).toLowerCase() === 'true',
    });
  }

  @Post('observability/notifications/:id/read')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '标记单条站内告警已读' })
  markAlertNotificationRead(@Param('id') id: string) {
    return this.executionService.markAlertNotificationRead(id);
  }

  @Post('observability/notifications/read-all')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '标记站内告警全部已读' })
  markAllAlertNotificationsRead(@Query('projectId') projectId?: string) {
    return this.executionService.markAllAlertNotificationsRead(projectId);
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
  findExecutions(@Param('id') id: string, @Query('all') all?: string, @Query('batchNo') batchNo?: string) {
    return this.executionService.findExecutions(id, {
      all: String(all).toLowerCase() === 'true',
      batchNo,
    });
  }

  @Get(':id/callbacks')
  @ApiOperation({ description: '获取任务回调记录' })
  findCallbacks(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('batchNo') batchNo?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.executionService.findCallbacks(id, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      status,
      batchNo,
      from,
      to,
    });
  }

  @Get(':id/callbacks/health')
  @ApiOperation({ description: '获取任务回调健康状态' })
  getCallbackHealth(@Param('id') id: string) {
    return this.executionService.getCallbackHealth(id);
  }

  @Post(':id/callbacks/:callbackId/retry')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '重试单条任务回调' })
  retryCallback(@Param('id') id: string, @Param('callbackId') callbackId: string) {
    return this.executionService.retryCallback(id, callbackId);
  }

  @Post(':id/callbacks/retry-failed')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '批量重试失败任务回调' })
  retryFailedCallbacks(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.executionService.retryFailedCallbacks(id, limit ? Number(limit) : 20);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '删除任务' })
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }
}
