import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateScenarioFromTemplateDto,
  CreateIntegrationScenarioDto,
  ExecuteIntegrationScenarioDto,
  ExecuteGovernanceRulesDto,
  ImportScenarioTemplatesDto,
  QueryTemplateAuditDiffDto,
  QueryTemplateAuditDto,
  QueryIntegrationScenarioDto,
  QueryScenarioExecutionDto,
  ReviewScenarioTemplateDto,
  NotifyTemplateLifecycleDto,
  UpdateTemplateLifecycleDto,
  UpdateGovernanceRuleDto,
  UpdateQualityPolicyDto,
  UpdateIntegrationScenarioDto,
} from './dto/integration-scenario.dto';
import { IntegrationScenarioService } from './integration-scenario.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('接口集成测试场景')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integration-scenarios')
export class IntegrationScenarioController {
  constructor(private readonly scenarioService: IntegrationScenarioService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '创建接口集成测试场景' })
  create(@Body() createDto: CreateIntegrationScenarioDto, @Request() req: any) {
    return this.scenarioService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ description: '查询接口集成测试场景' })
  findAll(@Query() query: QueryIntegrationScenarioDto) {
    return this.scenarioService.findAll(query);
  }

  @Get('templates')
  @ApiOperation({ description: '获取场景模板列表' })
  listTemplates() {
    return this.scenarioService.listTemplates();
  }

  @Post('templates/:templateKey')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '基于模板创建场景' })
  createFromTemplate(
    @Param('templateKey') templateKey: string,
    @Body() dto: CreateScenarioFromTemplateDto,
    @Request() req: any,
  ) {
    return this.scenarioService.createFromTemplate(templateKey, dto, req.user.userId);
  }

  @Get('templates/export')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '导出场景模板' })
  exportTemplates() {
    return this.scenarioService.exportTemplates();
  }

  @Post('templates/import')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '导入场景模板（支持覆盖）' })
  importTemplates(@Body() dto: ImportScenarioTemplatesDto, @Request() req: any) {
    return this.scenarioService.importTemplates(dto, req.user.userId);
  }

  @Get('templates/review-queue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ description: '获取模板审核队列（待审核）' })
  getTemplateReviewQueue() {
    return this.scenarioService.getTemplateReviewQueue();
  }

  @Get('templates/quality-report')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取模板质量评分报告' })
  getTemplateQualityReport() {
    return this.scenarioService.getTemplateQualityReport();
  }

  @Get('templates/quality-policies')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取模板质量评分权重策略' })
  getQualityPolicies() {
    return this.scenarioService.getQualityPolicies();
  }

  @Put('templates/quality-policies/:businessLine')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ description: '更新模板质量评分权重策略' })
  upsertQualityPolicy(
    @Param('businessLine') businessLine: string,
    @Body() dto: UpdateQualityPolicyDto,
    @Request() req: any,
  ) {
    return this.scenarioService.upsertQualityPolicy(businessLine, dto, req.user.userId);
  }

  @Post('templates/:templateKey/submit')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '提交模板审核' })
  submitTemplateForReview(@Param('templateKey') templateKey: string, @Request() req: any) {
    return this.scenarioService.submitTemplateForReview(templateKey, req.user.userId);
  }

  @Post('templates/:templateKey/review')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ description: '审核模板（通过/驳回）' })
  reviewTemplate(
    @Param('templateKey') templateKey: string,
    @Body() dto: ReviewScenarioTemplateDto,
    @Request() req: any,
  ) {
    return this.scenarioService.reviewTemplate(templateKey, dto, req.user.userId);
  }

  @Put('templates/:templateKey/lifecycle')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ description: '更新模板生命周期（active/deprecated/archived）' })
  updateTemplateLifecycle(
    @Param('templateKey') templateKey: string,
    @Body() dto: UpdateTemplateLifecycleDto,
    @Request() req: any,
  ) {
    return this.scenarioService.updateTemplateLifecycle(templateKey, dto, req.user.userId);
  }

  @Get('templates/lifecycle-reminders')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取模板生命周期治理提醒' })
  getTemplateLifecycleReminders() {
    return this.scenarioService.getTemplateLifecycleReminders();
  }

  @Get('templates/release-notices')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取模板发布通告列表' })
  getTemplateReleaseNotices(@Query('limit') limit?: string) {
    return this.scenarioService.getTemplateReleaseNotices(limit ? Number(limit) : 20);
  }

  @Get('templates/release-audit-report')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取模板发布审计报表（时间线+动作统计）' })
  getTemplateReleaseAuditReport(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.scenarioService.getTemplateReleaseAuditReport(days ? Number(days) : 30, limit ? Number(limit) : 200);
  }

  @Get('templates/governance-rules')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取模板治理自动流转规则配置' })
  getGovernanceRules() {
    return this.scenarioService.getGovernanceRules();
  }

  @Put('templates/governance-rules/:businessLine')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ description: '更新模板治理自动流转规则配置' })
  upsertGovernanceRule(
    @Param('businessLine') businessLine: string,
    @Body() dto: UpdateGovernanceRuleDto,
    @Request() req: any,
  ) {
    return this.scenarioService.upsertGovernanceRule(businessLine, dto, req.user.userId);
  }

  @Post('templates/governance-rules/execute')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '执行模板治理自动流转规则（支持dry-run）' })
  executeGovernanceRules(@Body() dto: ExecuteGovernanceRulesDto, @Request() req: any) {
    return this.scenarioService.executeGovernanceRules(dto, req.user.userId);
  }

  @Post('templates/lifecycle-reminders/notify')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '发送生命周期提醒通知（Webhook/邮件网关）' })
  notifyTemplateLifecycleReminders(@Body() dto: NotifyTemplateLifecycleDto, @Request() req: any) {
    return this.scenarioService.notifyTemplateLifecycleReminders(dto, req.user.userId);
  }

  @Get('templates/:templateKey/audits')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取模板审核归档记录' })
  getTemplateAuditLogs(@Param('templateKey') templateKey: string, @Query() query: QueryTemplateAuditDto) {
    return this.scenarioService.getTemplateAuditLogs(templateKey, query);
  }

  @Get('templates/:templateKey/audits/diff')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '获取模板审核记录差异对比' })
  getTemplateAuditDiff(@Param('templateKey') templateKey: string, @Query() query: QueryTemplateAuditDiffDto) {
    return this.scenarioService.getTemplateAuditDiff(templateKey, query);
  }

  @Get(':id')
  @ApiOperation({ description: '获取接口集成测试场景详情' })
  findOne(@Param('id') id: string) {
    return this.scenarioService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '更新接口集成测试场景' })
  update(@Param('id') id: string, @Body() updateDto: UpdateIntegrationScenarioDto, @Request() req: any) {
    return this.scenarioService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '删除接口集成测试场景' })
  remove(@Param('id') id: string) {
    return this.scenarioService.remove(id);
  }

  @Post(':id/execute')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '执行接口集成测试场景' })
  execute(@Param('id') id: string, @Body() executeDto: ExecuteIntegrationScenarioDto, @Request() req: any) {
    return this.scenarioService.execute(id, executeDto, req.user.userId);
  }

  @Get(':id/executions')
  @ApiOperation({ description: '查询场景执行记录' })
  findExecutions(@Param('id') id: string, @Query() query: QueryScenarioExecutionDto) {
    return this.scenarioService.findExecutions(id, query);
  }

  @Get('executions/:executionId')
  @ApiOperation({ description: '获取单条场景执行记录详情' })
  findExecutionById(@Param('executionId') executionId: string) {
    return this.scenarioService.findExecutionById(executionId);
  }
}
