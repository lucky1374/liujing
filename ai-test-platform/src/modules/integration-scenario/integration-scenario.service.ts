import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { Method } from 'axios';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import {
  CreateScenarioFromTemplateDto,
  CreateIntegrationScenarioDto,
  ExecuteIntegrationScenarioDto,
  QueryGovernanceExecutionDto,
  ExecuteGovernanceRulesDto,
  ImportScenarioTemplatesDto,
  NotifyTemplateLifecycleDto,
  QueryTemplateAuditDiffDto,
  QueryTemplateAuditDto,
  QueryIntegrationScenarioDto,
  QueryScenarioExecutionDto,
  ReviewScenarioTemplateDto,
  ScenarioTemplateItemDto,
  ScenarioStepDto,
  UpdateTemplateLifecycleDto,
  UpdateGovernanceRuleDto,
  UpdateQualityPolicyDto,
  UpdateIntegrationScenarioDto,
} from './dto/integration-scenario.dto';
import {
  IntegrationScenario,
  IntegrationScenarioStatus,
} from './entities/integration-scenario.entity';
import {
  IntegrationScenarioExecution,
  IntegrationScenarioExecutionStatus,
} from './entities/integration-scenario-execution.entity';
import {
  IntegrationScenarioTemplate,
  IntegrationScenarioTemplateLifecycleStatus,
  IntegrationScenarioTemplateStatus,
} from './entities/integration-scenario-template.entity';
import {
  IntegrationScenarioTemplateAudit,
  IntegrationScenarioTemplateAuditAction,
} from './entities/integration-scenario-template-audit.entity';
import { IntegrationScenarioQualityPolicy } from './entities/integration-scenario-quality-policy.entity';
import { IntegrationScenarioGovernanceRule } from './entities/integration-scenario-governance-rule.entity';
import { ScenarioExecutionEngine } from './scenario-execution.engine';
import { SCENARIO_TEMPLATES, ScenarioTemplateDefinition } from './scenario-templates';

@Injectable()
export class IntegrationScenarioService {
  constructor(
    @InjectRepository(IntegrationScenario)
    private readonly scenarioRepository: Repository<IntegrationScenario>,
    @InjectRepository(IntegrationScenarioExecution)
    private readonly executionRepository: Repository<IntegrationScenarioExecution>,
    @InjectRepository(IntegrationScenarioTemplate)
    private readonly templateRepository: Repository<IntegrationScenarioTemplate>,
    @InjectRepository(IntegrationScenarioTemplateAudit)
    private readonly templateAuditRepository: Repository<IntegrationScenarioTemplateAudit>,
    @InjectRepository(IntegrationScenarioQualityPolicy)
    private readonly qualityPolicyRepository: Repository<IntegrationScenarioQualityPolicy>,
    @InjectRepository(IntegrationScenarioGovernanceRule)
    private readonly governanceRuleRepository: Repository<IntegrationScenarioGovernanceRule>,
    private readonly configService: ConfigService,
  ) {}

  async create(createDto: CreateIntegrationScenarioDto, userId: string): Promise<IntegrationScenario> {
    const entity = this.scenarioRepository.create({
      ...createDto,
      steps: (createDto.steps || []) as unknown as Array<Record<string, unknown>>,
      defaultVariables: createDto.defaultVariables || {},
      status: createDto.status || IntegrationScenarioStatus.DRAFT,
      createdBy: userId,
      updatedBy: userId,
    });
    return this.scenarioRepository.save(entity);
  }

  async findAll(query: QueryIntegrationScenarioDto): Promise<{
    list: IntegrationScenario[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(Math.max(1, Number(query.pageSize || 10)), 100);
    const qb = this.scenarioRepository.createQueryBuilder('s');

    if (query.projectId) {
      qb.andWhere('s.projectId = :projectId', { projectId: query.projectId });
    }
    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    }
    if (query.name) {
      qb.andWhere('s.name LIKE :name', { name: `%${query.name}%` });
    }

    const [list, total] = await qb
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async listTemplates(): Promise<Array<{
    key: string;
    name: string;
    description: string;
    category: string;
    version: number;
    source: 'system' | 'custom';
    status: IntegrationScenarioTemplateStatus;
    lifecycleStatus: IntegrationScenarioTemplateLifecycleStatus;
    lifecycleComment?: string;
    releaseTag?: string;
    releasedAt?: Date | null;
    releaseNote?: string;
    reviewComment?: string;
    qualityScore: number;
    qualityLevel: 'high' | 'medium' | 'low';
    qualityBreakdown: {
      structure: number;
      assertions: number;
      variableDependency: number;
      maintainability: number;
    };
    qualityPolicy: {
      businessLine: string;
      source: 'default' | 'custom';
      weights: {
        structure: number;
        assertions: number;
        variableDependency: number;
        maintainability: number;
      };
    };
    defaultVariables: Record<string, unknown>;
    stepCount: number;
  }>> {
    const policyMap = await this.getQualityPolicyMap();
    const customTemplates = await this.templateRepository.find({ order: { updatedAt: 'DESC' } });
    const systemMap = new Map(SCENARIO_TEMPLATES.map((item) => [item.key, item]));

    const customMapped = customTemplates.map((tpl) => ({
      key: tpl.key,
      name: tpl.name,
      description: tpl.description,
      category: tpl.category,
      version: tpl.version || 1,
      source: 'custom' as const,
      status: tpl.status || IntegrationScenarioTemplateStatus.APPROVED,
      lifecycleStatus: tpl.lifecycleStatus || IntegrationScenarioTemplateLifecycleStatus.ACTIVE,
      lifecycleComment: tpl.lifecycleComment || '',
      releaseTag: tpl.releaseTag || '',
      releasedAt: tpl.releasedAt || null,
      releaseNote: tpl.releaseNote || '',
      reviewComment: tpl.reviewComment || '',
      ...this.evaluateTemplateQuality(tpl.steps || [], tpl.defaultVariables || {}, tpl.category, policyMap),
      defaultVariables: tpl.defaultVariables || {},
      stepCount: (tpl.steps || []).length,
    }));

    const systemMapped = SCENARIO_TEMPLATES
      .filter((tpl) => !customMapped.some((item) => item.key === tpl.key))
      .map((tpl) => ({
        key: tpl.key,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        version: 1,
        source: 'system' as const,
        status: IntegrationScenarioTemplateStatus.APPROVED,
        lifecycleStatus: IntegrationScenarioTemplateLifecycleStatus.ACTIVE,
        lifecycleComment: '',
        releaseTag: `system/${tpl.key}/v1`,
        releasedAt: null,
        releaseNote: 'system template',
        reviewComment: '',
        ...this.evaluateTemplateQuality(tpl.steps || [], tpl.defaultVariables || {}, tpl.category, policyMap),
        defaultVariables: tpl.defaultVariables,
        stepCount: tpl.steps.length,
      }));

    const merged = [...customMapped, ...systemMapped].sort((a, b) => {
      if (a.source !== b.source) return a.source === 'custom' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // ensure keys are unique in merged result
    const keySet = new Set<string>();
    return merged.filter((item) => {
      if (keySet.has(item.key)) return false;
      keySet.add(item.key);
      return true;
    }).map((item) => ({
      ...item,
      // keep lint happy about systemMap possibly unused in future extension
      category: item.category || systemMap.get(item.key)?.category || 'general',
    }));
  }

  async createFromTemplate(templateKey: string, dto: CreateScenarioFromTemplateDto, userId: string): Promise<IntegrationScenario> {
    const template = await this.resolveTemplate(templateKey);
    if (!template) {
      throw new NotFoundException('场景模板不存在');
    }
    if (template.source === 'custom' && template.status !== IntegrationScenarioTemplateStatus.APPROVED) {
      throw new BadRequestException('当前模板未审核通过，不能用于创建场景');
    }
    if (
      template.source === 'custom'
      && template.lifecycleStatus
      && template.lifecycleStatus !== IntegrationScenarioTemplateLifecycleStatus.ACTIVE
    ) {
      throw new BadRequestException('当前模板已废弃或归档，不能用于创建场景');
    }

    const createDto: CreateIntegrationScenarioDto = {
      projectId: dto.projectId,
      name: dto.name || template.name,
      description: dto.description || template.description,
      status: dto.status || IntegrationScenarioStatus.DRAFT,
      steps: template.steps as unknown as ScenarioStepDto[],
      sourceTemplateKey: template.key,
      defaultVariables: {
        ...(template.defaultVariables || {}),
        ...(dto.variables || {}),
      },
    };

    return this.create(createDto, userId);
  }

  async exportTemplates(): Promise<{
    exportedAt: string;
    total: number;
    templates: ScenarioTemplateItemDto[];
  }> {
    const custom = await this.templateRepository.find({ order: { updatedAt: 'DESC' } });
    const customMapped: ScenarioTemplateItemDto[] = custom.map((tpl) => ({
      key: tpl.key,
      name: tpl.name,
      description: tpl.description,
      category: tpl.category,
      version: tpl.version || 1,
      defaultVariables: tpl.defaultVariables || {},
      steps: (tpl.steps || []) as unknown as ScenarioStepDto[],
    }));

    const customKeys = new Set(customMapped.map((item) => item.key));
    const systemMapped: ScenarioTemplateItemDto[] = SCENARIO_TEMPLATES
      .filter((tpl) => !customKeys.has(tpl.key))
      .map((tpl) => ({
        key: tpl.key,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        version: 1,
        defaultVariables: tpl.defaultVariables,
        steps: tpl.steps as unknown as ScenarioStepDto[],
      }));

    const templates = [...customMapped, ...systemMapped];
    return {
      exportedAt: new Date().toISOString(),
      total: templates.length,
      templates,
    };
  }

  async importTemplates(dto: ImportScenarioTemplatesDto, userId: string): Promise<{
    imported: number;
    skipped: number;
    overwrite: boolean;
    keys: string[];
  }> {
    const overwrite = dto.overwrite !== false;
    const templates = dto.templates || [];
    let imported = 0;
    let skipped = 0;
    const keys: string[] = [];

    for (const tpl of templates) {
      const key = String(tpl.key || '').trim();
      if (!key) {
        skipped += 1;
        continue;
      }

      const existed = await this.templateRepository.findOne({ where: { key } });
      if (existed && !overwrite) {
        skipped += 1;
        continue;
      }

      const payload = {
        key,
        name: tpl.name,
        description: tpl.description || '',
        category: tpl.category || 'general',
        version: Math.max(1, Number(tpl.version || 1)),
        status: IntegrationScenarioTemplateStatus.PENDING_REVIEW,
        lifecycleStatus: IntegrationScenarioTemplateLifecycleStatus.ACTIVE,
        lifecycleComment: '',
        releaseTag: '',
        releasedAt: null,
        releaseNote: '',
        reviewComment: '',
        submittedBy: userId,
        submittedAt: new Date(),
        reviewedBy: undefined,
        reviewedAt: undefined,
        defaultVariables: tpl.defaultVariables || {},
        steps: (tpl.steps || []) as unknown as Array<Record<string, unknown>>,
        updatedBy: userId,
        createdBy: existed?.createdBy || userId,
      };

      const before = existed ? this.toTemplateSnapshot(existed) : null;
      let savedTemplate: IntegrationScenarioTemplate;

      if (existed) {
        const next = this.templateRepository.merge(existed, payload);
        savedTemplate = await this.templateRepository.save(next);
      } else {
        savedTemplate = await this.templateRepository.save(this.templateRepository.create(payload));
      }

      await this.logTemplateAudit(
        key,
        IntegrationScenarioTemplateAuditAction.IMPORTED,
        userId,
        `模板导入${existed ? '覆盖' : '新增'}`,
        before,
        this.toTemplateSnapshot(savedTemplate),
      );

      imported += 1;
      keys.push(key);
    }

    return { imported, skipped, overwrite, keys };
  }

  async getTemplateReviewQueue(): Promise<IntegrationScenarioTemplate[]> {
    return this.templateRepository.find({
      where: { status: IntegrationScenarioTemplateStatus.PENDING_REVIEW },
      order: { updatedAt: 'DESC' },
      take: 200,
    });
  }

  async getTemplateQualityReport(): Promise<{
    generatedAt: string;
    total: number;
    averageScore: number;
    templates: Array<{
      key: string;
      name: string;
      source: 'system' | 'custom';
      status: IntegrationScenarioTemplateStatus;
      qualityScore: number;
      qualityLevel: 'high' | 'medium' | 'low';
      qualityBreakdown: {
        structure: number;
        assertions: number;
        variableDependency: number;
        maintainability: number;
      };
    }>;
  }> {
    const templates = await this.listTemplates();
    const averageScore = templates.length
      ? Number((templates.reduce((sum, item) => sum + item.qualityScore, 0) / templates.length).toFixed(2))
      : 0;

    return {
      generatedAt: new Date().toISOString(),
      total: templates.length,
      averageScore,
      templates: templates
        .map((item) => ({
          key: item.key,
          name: item.name,
          source: item.source,
          status: item.status,
          qualityScore: item.qualityScore,
          qualityLevel: item.qualityLevel,
          qualityBreakdown: item.qualityBreakdown,
        }))
        .sort((a, b) => b.qualityScore - a.qualityScore),
    };
  }

  async getQualityPolicies(): Promise<Array<{
    businessLine: string;
    description: string;
    enabled: boolean;
    source: 'default' | 'custom';
    weights: {
      structure: number;
      assertions: number;
      variableDependency: number;
      maintainability: number;
    };
  }>> {
    const defaults = this.getDefaultQualityPolicyMap();
    const customs = await this.qualityPolicyRepository.find({ order: { updatedAt: 'DESC' } });
    const map = new Map<string, {
      businessLine: string;
      description: string;
      enabled: boolean;
      source: 'default' | 'custom';
      weights: {
        structure: number;
        assertions: number;
        variableDependency: number;
        maintainability: number;
      };
    }>();

    for (const [businessLine, item] of defaults.entries()) {
      map.set(businessLine, {
        businessLine,
        description: item.description,
        enabled: true,
        source: 'default',
        weights: item.weights,
      });
    }

    for (const item of customs) {
      map.set(item.businessLine, {
        businessLine: item.businessLine,
        description: item.description || map.get(item.businessLine)?.description || '',
        enabled: item.enabled,
        source: 'custom',
        weights: this.normalizeQualityWeights(item.weights),
      });
    }

    return Array.from(map.values()).sort((a, b) => a.businessLine.localeCompare(b.businessLine));
  }

  async upsertQualityPolicy(
    businessLine: string,
    dto: UpdateQualityPolicyDto,
    userId: string,
  ): Promise<IntegrationScenarioQualityPolicy> {
    const key = String(businessLine || '').trim();
    if (!key) {
      throw new BadRequestException('businessLine 不能为空');
    }

    const weights = this.normalizeQualityWeights({
      structure: dto.structure,
      assertions: dto.assertions,
      variableDependency: dto.variableDependency,
      maintainability: dto.maintainability,
    });
    const sum = weights.structure + weights.assertions + weights.variableDependency + weights.maintainability;
    if (sum <= 0) {
      throw new BadRequestException('评分权重总和必须大于0');
    }

    const existed = await this.qualityPolicyRepository.findOne({ where: { businessLine: key } });
    if (existed) {
      existed.description = dto.description || existed.description || '';
      existed.enabled = dto.enabled ?? existed.enabled;
      existed.weights = weights;
      existed.updatedBy = userId;
      return this.qualityPolicyRepository.save(existed);
    }

    return this.qualityPolicyRepository.save(
      this.qualityPolicyRepository.create({
        businessLine: key,
        description: dto.description || '',
        enabled: dto.enabled ?? true,
        weights,
        updatedBy: userId,
      }),
    );
  }

  async getGovernanceRules(): Promise<Array<{
    businessLine: string;
    source: 'default' | 'custom';
    description: string;
    enabled: boolean;
    autoRejectPendingReviewEnabled: boolean;
    pendingReviewTimeoutDays: number;
    autoDeprecatedRejectedEnabled: boolean;
    rejectedNotFixedDays: number;
    autoReleaseApprovedEnabled: boolean;
    autoDeprecatedLowQualityEnabled: boolean;
    lowQualityThreshold: number;
  }>> {
    const defaults = this.getDefaultGovernanceRuleMap();
    const customs = await this.governanceRuleRepository.find({ order: { updatedAt: 'DESC' } });
    const map = new Map<string, {
      businessLine: string;
      source: 'default' | 'custom';
      description: string;
      enabled: boolean;
      autoRejectPendingReviewEnabled: boolean;
      pendingReviewTimeoutDays: number;
      autoDeprecatedRejectedEnabled: boolean;
      rejectedNotFixedDays: number;
      autoReleaseApprovedEnabled: boolean;
      autoDeprecatedLowQualityEnabled: boolean;
      lowQualityThreshold: number;
    }>();

    for (const [businessLine, item] of defaults.entries()) {
      map.set(businessLine, {
        businessLine,
        source: 'default',
        description: item.description,
        enabled: item.enabled,
        autoRejectPendingReviewEnabled: item.autoRejectPendingReviewEnabled,
        pendingReviewTimeoutDays: item.pendingReviewTimeoutDays,
        autoDeprecatedRejectedEnabled: item.autoDeprecatedRejectedEnabled,
        rejectedNotFixedDays: item.rejectedNotFixedDays,
        autoReleaseApprovedEnabled: item.autoReleaseApprovedEnabled,
        autoDeprecatedLowQualityEnabled: item.autoDeprecatedLowQualityEnabled,
        lowQualityThreshold: item.lowQualityThreshold,
      });
    }

    for (const item of customs) {
      map.set(item.businessLine, {
        businessLine: item.businessLine,
        source: 'custom',
        description: item.description || map.get(item.businessLine)?.description || '',
        enabled: item.enabled,
        autoRejectPendingReviewEnabled: item.autoRejectPendingReviewEnabled,
        pendingReviewTimeoutDays: item.pendingReviewTimeoutDays,
        autoDeprecatedRejectedEnabled: item.autoDeprecatedRejectedEnabled,
        rejectedNotFixedDays: item.rejectedNotFixedDays,
        autoReleaseApprovedEnabled: item.autoReleaseApprovedEnabled,
        autoDeprecatedLowQualityEnabled: item.autoDeprecatedLowQualityEnabled,
        lowQualityThreshold: item.lowQualityThreshold,
      });
    }

    return Array.from(map.values()).sort((a, b) => a.businessLine.localeCompare(b.businessLine));
  }

  async upsertGovernanceRule(
    businessLine: string,
    dto: UpdateGovernanceRuleDto,
    userId: string,
  ): Promise<IntegrationScenarioGovernanceRule> {
    const key = String(businessLine || '').trim();
    if (!key) {
      throw new BadRequestException('businessLine 不能为空');
    }

    const existed = await this.governanceRuleRepository.findOne({ where: { businessLine: key } });
    const defaults = this.getDefaultGovernanceRuleMap().get(key) || this.getDefaultGovernanceRuleMap().get('general')!;
    const payload = {
      description: dto.description ?? (existed?.description || defaults.description),
      enabled: dto.enabled ?? (existed?.enabled ?? defaults.enabled),
      autoRejectPendingReviewEnabled:
        dto.autoRejectPendingReviewEnabled ?? (existed?.autoRejectPendingReviewEnabled ?? defaults.autoRejectPendingReviewEnabled),
      pendingReviewTimeoutDays:
        dto.pendingReviewTimeoutDays ?? (existed?.pendingReviewTimeoutDays ?? defaults.pendingReviewTimeoutDays),
      autoDeprecatedRejectedEnabled:
        dto.autoDeprecatedRejectedEnabled ?? (existed?.autoDeprecatedRejectedEnabled ?? defaults.autoDeprecatedRejectedEnabled),
      rejectedNotFixedDays:
        dto.rejectedNotFixedDays ?? (existed?.rejectedNotFixedDays ?? defaults.rejectedNotFixedDays),
      autoReleaseApprovedEnabled:
        dto.autoReleaseApprovedEnabled ?? (existed?.autoReleaseApprovedEnabled ?? defaults.autoReleaseApprovedEnabled),
      autoDeprecatedLowQualityEnabled:
        dto.autoDeprecatedLowQualityEnabled ?? (existed?.autoDeprecatedLowQualityEnabled ?? defaults.autoDeprecatedLowQualityEnabled),
      lowQualityThreshold: dto.lowQualityThreshold ?? (existed?.lowQualityThreshold ?? defaults.lowQualityThreshold),
      updatedBy: userId,
    };

    if (existed) {
      Object.assign(existed, payload);
      return this.governanceRuleRepository.save(existed);
    }

    return this.governanceRuleRepository.save(this.governanceRuleRepository.create({
      businessLine: key,
      ...payload,
    }));
  }

  async executeGovernanceRules(
    dto: ExecuteGovernanceRulesDto,
    userId: string,
  ): Promise<{
    dryRun: boolean;
    executedAt: string;
    totalTemplates: number;
    matchedCount: number;
    appliedCount: number;
    actions: Array<{
      templateKey: string;
      templateName: string;
      businessLine: string;
      ruleId: 'auto_reject_pending_review' | 'auto_deprecated_rejected' | 'auto_release_approved' | 'auto_deprecated_low_quality';
      reason: string;
      fromStatus: IntegrationScenarioTemplateStatus;
      toStatus: IntegrationScenarioTemplateStatus;
      fromLifecycle: IntegrationScenarioTemplateLifecycleStatus;
      toLifecycle: IntegrationScenarioTemplateLifecycleStatus;
      qualityScore?: number;
    }>;
  }> {
    const dryRun = Boolean(dto?.dryRun);
    const ruleMap = await this.getGovernanceRuleMap();
    const policyMap = await this.getQualityPolicyMap();
    const targetBusinessLine = String(dto?.businessLine || '').trim();

    const templates = await this.templateRepository.find({ order: { updatedAt: 'DESC' }, take: 1000 });
    const actions: Array<{
      templateKey: string;
      templateName: string;
      businessLine: string;
      ruleId: 'auto_reject_pending_review' | 'auto_deprecated_rejected' | 'auto_release_approved' | 'auto_deprecated_low_quality';
      reason: string;
      fromStatus: IntegrationScenarioTemplateStatus;
      toStatus: IntegrationScenarioTemplateStatus;
      fromLifecycle: IntegrationScenarioTemplateLifecycleStatus;
      toLifecycle: IntegrationScenarioTemplateLifecycleStatus;
      qualityScore?: number;
    }> = [];
    let appliedCount = 0;
    const nowMs = Date.now();

    for (const template of templates) {
      const businessLine = String(template.category || 'general').trim() || 'general';
      if (targetBusinessLine && targetBusinessLine !== businessLine) continue;

      const rule = ruleMap.get(businessLine) || ruleMap.get('general');
      if (!rule || !rule.enabled) continue;

      const beforeStatus = template.status || IntegrationScenarioTemplateStatus.DRAFT;
      const beforeLifecycle = template.lifecycleStatus || IntegrationScenarioTemplateLifecycleStatus.ACTIVE;

      if (
        rule.autoReleaseApprovedEnabled
        && beforeStatus === IntegrationScenarioTemplateStatus.APPROVED
        && !String(template.releaseTag || '').trim()
      ) {
        const reason = '规则命中：审核通过自动发布';
        actions.push({
          templateKey: template.key,
          templateName: template.name,
          businessLine,
          ruleId: 'auto_release_approved',
          reason,
          fromStatus: beforeStatus,
          toStatus: beforeStatus,
          fromLifecycle: beforeLifecycle,
          toLifecycle: beforeLifecycle,
        });

        if (!dryRun) {
          const beforeSnapshot = this.toTemplateSnapshot(template);
          await this.publishTemplateRelease(template, userId, reason);
          const latest = await this.templateRepository.findOne({ where: { id: template.id } });
          await this.logTemplateAudit(
            template.key,
            IntegrationScenarioTemplateAuditAction.GOVERNANCE_AUTO_TRANSITION,
            userId,
            `[auto_release_approved] ${reason}`,
            beforeSnapshot,
            latest ? this.toTemplateSnapshot(latest) : null,
          );
          appliedCount += 1;
        }
        continue;
      }

      if (
        rule.autoRejectPendingReviewEnabled
        && beforeStatus === IntegrationScenarioTemplateStatus.PENDING_REVIEW
        && template.submittedAt
      ) {
        const days = Math.floor((nowMs - new Date(template.submittedAt).getTime()) / (24 * 3600 * 1000));
        if (days >= rule.pendingReviewTimeoutDays) {
          const reason = `规则命中：待审核超时 ${days} 天（阈值 ${rule.pendingReviewTimeoutDays}）自动驳回`;
          actions.push({
            templateKey: template.key,
            templateName: template.name,
            businessLine,
            ruleId: 'auto_reject_pending_review',
            reason,
            fromStatus: beforeStatus,
            toStatus: IntegrationScenarioTemplateStatus.REJECTED,
            fromLifecycle: beforeLifecycle,
            toLifecycle: beforeLifecycle,
          });

          if (!dryRun) {
            const beforeSnapshot = this.toTemplateSnapshot(template);
            template.status = IntegrationScenarioTemplateStatus.REJECTED;
            template.reviewComment = reason;
            template.reviewedBy = userId;
            template.reviewedAt = new Date();
            template.updatedBy = userId;
            const saved = await this.templateRepository.save(template);
            await this.logTemplateAudit(
              template.key,
              IntegrationScenarioTemplateAuditAction.GOVERNANCE_AUTO_TRANSITION,
              userId,
              `[auto_reject_pending_review] ${reason}`,
              beforeSnapshot,
              this.toTemplateSnapshot(saved),
            );
            appliedCount += 1;
          }
          continue;
        }
      }

      if (
        rule.autoDeprecatedRejectedEnabled
        && beforeStatus === IntegrationScenarioTemplateStatus.REJECTED
        && beforeLifecycle === IntegrationScenarioTemplateLifecycleStatus.ACTIVE
        && template.reviewedAt
      ) {
        const days = Math.floor((nowMs - new Date(template.reviewedAt).getTime()) / (24 * 3600 * 1000));
        if (days >= rule.rejectedNotFixedDays) {
          const reason = `规则命中：驳回后 ${days} 天未处理（阈值 ${rule.rejectedNotFixedDays}）自动废弃`;
          actions.push({
            templateKey: template.key,
            templateName: template.name,
            businessLine,
            ruleId: 'auto_deprecated_rejected',
            reason,
            fromStatus: beforeStatus,
            toStatus: beforeStatus,
            fromLifecycle: beforeLifecycle,
            toLifecycle: IntegrationScenarioTemplateLifecycleStatus.DEPRECATED,
          });

          if (!dryRun) {
            const beforeSnapshot = this.toTemplateSnapshot(template);
            template.lifecycleStatus = IntegrationScenarioTemplateLifecycleStatus.DEPRECATED;
            template.lifecycleComment = reason;
            template.deprecatedAt = new Date();
            template.updatedBy = userId;
            const saved = await this.templateRepository.save(template);
            await this.logTemplateAudit(
              template.key,
              IntegrationScenarioTemplateAuditAction.GOVERNANCE_AUTO_TRANSITION,
              userId,
              `[auto_deprecated_rejected] ${reason}`,
              beforeSnapshot,
              this.toTemplateSnapshot(saved),
            );
            appliedCount += 1;
          }
          continue;
        }
      }

      if (
        rule.autoDeprecatedLowQualityEnabled
        && beforeStatus === IntegrationScenarioTemplateStatus.APPROVED
        && beforeLifecycle === IntegrationScenarioTemplateLifecycleStatus.ACTIVE
      ) {
        const quality = this.evaluateTemplateQuality(
          template.steps || [],
          template.defaultVariables || {},
          template.category,
          policyMap,
        );
        if (quality.qualityScore < rule.lowQualityThreshold) {
          const reason = `规则命中：质量分 ${quality.qualityScore} 低于阈值 ${rule.lowQualityThreshold}，自动废弃`;
          actions.push({
            templateKey: template.key,
            templateName: template.name,
            businessLine,
            ruleId: 'auto_deprecated_low_quality',
            reason,
            fromStatus: beforeStatus,
            toStatus: beforeStatus,
            fromLifecycle: beforeLifecycle,
            toLifecycle: IntegrationScenarioTemplateLifecycleStatus.DEPRECATED,
            qualityScore: quality.qualityScore,
          });

          if (!dryRun) {
            const beforeSnapshot = this.toTemplateSnapshot(template);
            template.lifecycleStatus = IntegrationScenarioTemplateLifecycleStatus.DEPRECATED;
            template.lifecycleComment = reason;
            template.deprecatedAt = new Date();
            template.updatedBy = userId;
            const saved = await this.templateRepository.save(template);
            await this.logTemplateAudit(
              template.key,
              IntegrationScenarioTemplateAuditAction.GOVERNANCE_AUTO_TRANSITION,
              userId,
              `[auto_deprecated_low_quality] ${reason}`,
              beforeSnapshot,
              this.toTemplateSnapshot(saved),
            );
            appliedCount += 1;
          }
        }
      }
    }

    return {
      dryRun,
      executedAt: new Date().toISOString(),
      totalTemplates: templates.length,
      matchedCount: actions.length,
      appliedCount,
      actions,
    };
  }

  async getGovernanceExecutions(query: QueryGovernanceExecutionDto): Promise<{
    list: Array<{
      id: string;
      createdAt: Date;
      templateKey: string;
      templateName: string;
      businessLine: string;
      operatorId: string;
      ruleId: string;
      comment: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
    summary: {
      totalInRange: number;
      byRule: Array<{ ruleId: string; count: number }>;
    };
  }> {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(Math.max(1, Number(query.pageSize || 20)), 100);
    const days = Number.isFinite(Number(query.days)) ? Math.min(Math.max(1, Number(query.days || 30)), 180) : 30;
    const businessLine = String(query.businessLine || '').trim();
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const logs = await this.templateAuditRepository.find({
      where: {
        action: IntegrationScenarioTemplateAuditAction.GOVERNANCE_AUTO_TRANSITION,
        createdAt: MoreThanOrEqual(since),
      },
      order: { createdAt: 'DESC' },
      take: 2000,
    });

    const templateKeys = Array.from(new Set(logs.map((item) => item.templateKey).filter(Boolean)));
    const templates = templateKeys.length
      ? await this.templateRepository.find({ where: { key: In(templateKeys) }, select: ['key', 'name', 'category'] })
      : [];
    const templateMap = new Map(templates.map((item) => [item.key, item]));

    const parsed = logs
      .map((item) => {
        const template = templateMap.get(item.templateKey);
        const rawComment = String(item.comment || '').trim();
        const ruleMatch = rawComment.match(/^\[([^\]]+)\]\s*/);
        const ruleId = ruleMatch ? String(ruleMatch[1] || '') : 'unknown';
        const comment = ruleMatch ? rawComment.replace(ruleMatch[0], '') : rawComment;
        return {
          id: item.id,
          createdAt: item.createdAt,
          templateKey: item.templateKey,
          templateName: template?.name || item.templateKey,
          businessLine: String(template?.category || 'general'),
          operatorId: item.operatorId || '',
          ruleId,
          comment,
        };
      })
      .filter((item) => (businessLine ? item.businessLine === businessLine : true));

    const ruleCounter = new Map<string, number>();
    for (const item of parsed) {
      ruleCounter.set(item.ruleId, (ruleCounter.get(item.ruleId) || 0) + 1);
    }
    const byRule = Array.from(ruleCounter.entries())
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count);

    const total = parsed.length;
    const list = parsed.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    return {
      list,
      total,
      page,
      pageSize,
      summary: {
        totalInRange: total,
        byRule,
      },
    };
  }

  async submitTemplateForReview(templateKey: string, userId: string): Promise<IntegrationScenarioTemplate> {
    const template = await this.templateRepository.findOne({ where: { key: templateKey } });
    if (!template) {
      throw new NotFoundException('自定义模板不存在');
    }
    const before = this.toTemplateSnapshot(template);

    template.status = IntegrationScenarioTemplateStatus.PENDING_REVIEW;
    template.reviewComment = '';
    template.submittedBy = userId;
    template.submittedAt = new Date();
    template.updatedBy = userId;
    const saved = await this.templateRepository.save(template);
    await this.logTemplateAudit(
      templateKey,
      IntegrationScenarioTemplateAuditAction.SUBMITTED,
      userId,
      '提交模板审核',
      before,
      this.toTemplateSnapshot(saved),
    );
    return saved;
  }

  async reviewTemplate(templateKey: string, dto: ReviewScenarioTemplateDto, userId: string): Promise<IntegrationScenarioTemplate> {
    const template = await this.templateRepository.findOne({ where: { key: templateKey } });
    if (!template) {
      throw new NotFoundException('自定义模板不存在');
    }
    const before = this.toTemplateSnapshot(template);

    const action = dto.action;
    if (action !== 'approve' && action !== 'reject') {
      throw new BadRequestException('审核动作不合法');
    }

    template.status = action === 'approve'
      ? IntegrationScenarioTemplateStatus.APPROVED
      : IntegrationScenarioTemplateStatus.REJECTED;
    template.reviewComment = dto.comment || '';
    template.reviewedBy = userId;
    template.reviewedAt = new Date();
    template.updatedBy = userId;

    const saved = await this.templateRepository.save(template);
    await this.logTemplateAudit(
      templateKey,
      action === 'approve'
        ? IntegrationScenarioTemplateAuditAction.APPROVED
        : IntegrationScenarioTemplateAuditAction.REJECTED,
      userId,
      dto.comment || (action === 'approve' ? '审核通过' : '审核驳回'),
      before,
      this.toTemplateSnapshot(saved),
    );

    if (action === 'approve') {
      await this.publishTemplateRelease(saved, userId, dto.comment || '审核通过自动发布');
      const latest = await this.templateRepository.findOne({ where: { id: saved.id } });
      return latest || saved;
    }

    return saved;
  }

  async updateTemplateLifecycle(
    templateKey: string,
    dto: UpdateTemplateLifecycleDto,
    userId: string,
  ): Promise<IntegrationScenarioTemplate> {
    const template = await this.templateRepository.findOne({ where: { key: templateKey } });
    if (!template) {
      throw new NotFoundException('自定义模板不存在');
    }

    const before = this.toTemplateSnapshot(template);
    template.lifecycleStatus = dto.lifecycleStatus;
    template.lifecycleComment = dto.comment || '';
    template.updatedBy = userId;

    if (dto.lifecycleStatus === IntegrationScenarioTemplateLifecycleStatus.DEPRECATED) {
      template.deprecatedAt = new Date();
      template.archivedAt = null;
    } else if (dto.lifecycleStatus === IntegrationScenarioTemplateLifecycleStatus.ARCHIVED) {
      template.archivedAt = new Date();
      if (!template.deprecatedAt) {
        template.deprecatedAt = new Date();
      }
    } else {
      template.deprecatedAt = null;
      template.archivedAt = null;
    }

    const saved = await this.templateRepository.save(template);
    await this.logTemplateAudit(
      templateKey,
      IntegrationScenarioTemplateAuditAction.LIFECYCLE_UPDATED,
      userId,
      `生命周期更新为 ${dto.lifecycleStatus}: ${dto.comment || ''}`,
      before,
      this.toTemplateSnapshot(saved),
    );
    return saved;
  }

  async getTemplateLifecycleReminders(): Promise<{
    generatedAt: string;
    reminders: Array<{
      templateKey: string;
      level: 'info' | 'warning' | 'critical';
      type: 'review_timeout' | 'deprecated_too_long' | 'rejected_not_fixed';
      message: string;
      days: number;
    }>;
  }> {
    const list = await this.templateRepository.find({ order: { updatedAt: 'DESC' }, take: 500 });
    const now = Date.now();
    const reminders: Array<{
      templateKey: string;
      level: 'info' | 'warning' | 'critical';
      type: 'review_timeout' | 'deprecated_too_long' | 'rejected_not_fixed';
      message: string;
      days: number;
    }> = [];

    for (const item of list) {
      if (item.status === IntegrationScenarioTemplateStatus.PENDING_REVIEW && item.submittedAt) {
        const days = Math.floor((now - new Date(item.submittedAt).getTime()) / (24 * 3600 * 1000));
        if (days >= 2) {
          reminders.push({
            templateKey: item.key,
            level: days >= 7 ? 'critical' : 'warning',
            type: 'review_timeout',
            message: `模板待审核 ${days} 天，建议尽快处理`,
            days,
          });
        }
      }

      if (item.lifecycleStatus === IntegrationScenarioTemplateLifecycleStatus.DEPRECATED && item.deprecatedAt) {
        const days = Math.floor((now - new Date(item.deprecatedAt).getTime()) / (24 * 3600 * 1000));
        if (days >= 14) {
          reminders.push({
            templateKey: item.key,
            level: days >= 30 ? 'critical' : 'warning',
            type: 'deprecated_too_long',
            message: `模板已废弃 ${days} 天，建议归档或修复后恢复`,
            days,
          });
        }
      }

      if (item.status === IntegrationScenarioTemplateStatus.REJECTED && item.reviewedAt) {
        const days = Math.floor((now - new Date(item.reviewedAt).getTime()) / (24 * 3600 * 1000));
        if (days >= 7) {
          reminders.push({
            templateKey: item.key,
            level: 'info',
            type: 'rejected_not_fixed',
            message: `模板驳回后 ${days} 天未处理，建议修复并重新提交`,
            days,
          });
        }
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      reminders: reminders.sort((a, b) => b.days - a.days),
    };
  }

  async getTemplateReleaseNotices(limit: number = 20): Promise<Array<{
    key: string;
    name: string;
    category: string;
    version: number;
    releaseTag: string;
    releasedAt: Date | null;
    releaseNote: string;
    reviewedBy: string;
  }>> {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, Math.floor(limit)), 100) : 20;
    const templates = await this.templateRepository.find({
      where: {
        status: IntegrationScenarioTemplateStatus.APPROVED,
      },
      order: { releasedAt: 'DESC', updatedAt: 'DESC' },
      take: safeLimit,
    });

    return templates
      .filter((item) => !!item.releaseTag)
      .map((item) => ({
        key: item.key,
        name: item.name,
        category: item.category || 'general',
        version: item.version || 1,
        releaseTag: item.releaseTag,
        releasedAt: item.releasedAt || null,
        releaseNote: item.releaseNote || '',
        reviewedBy: item.reviewedBy || '',
      }));
  }

  async getTemplateReleaseAuditReport(days: number = 30, limit: number = 200): Promise<{
    timeRangeDays: number;
    summary: {
      totalLogs: number;
      approvedCount: number;
      releasedCount: number;
      rejectedCount: number;
      submittedCount: number;
      reminderNotifiedCount: number;
      lifecycleUpdatedCount: number;
    };
    actions: Array<{ action: IntegrationScenarioTemplateAuditAction; count: number }>;
    perDay: Array<{ date: string; total: number; released: number; approved: number; rejected: number }>;
    timeline: Array<{
      id: string;
      createdAt: Date;
      templateKey: string;
      templateName: string;
      action: IntegrationScenarioTemplateAuditAction;
      operatorId: string;
      comment: string;
    }>;
  }> {
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(1, Math.floor(days)), 90) : 30;
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, Math.floor(limit)), 1000) : 200;
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const logs = await this.templateAuditRepository.find({
      where: {
        createdAt: MoreThanOrEqual(since),
      },
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });

    const templateKeys = Array.from(new Set(logs.map((item) => item.templateKey).filter(Boolean)));
    const templates = templateKeys.length
      ? await this.templateRepository.find({ where: { key: In(templateKeys) }, select: ['key', 'name'] })
      : [];
    const templateNameMap = new Map(templates.map((item) => [item.key, item.name]));

    const actionCounter: Record<string, number> = {};
    const dayCounter = new Map<string, { total: number; released: number; approved: number; rejected: number }>();

    for (const log of logs) {
      const action = String(log.action || '');
      actionCounter[action] = (actionCounter[action] || 0) + 1;

      const day = new Date(log.createdAt).toISOString().slice(0, 10);
      const existed = dayCounter.get(day) || { total: 0, released: 0, approved: 0, rejected: 0 };
      existed.total += 1;
      if (log.action === IntegrationScenarioTemplateAuditAction.RELEASED) existed.released += 1;
      if (log.action === IntegrationScenarioTemplateAuditAction.APPROVED) existed.approved += 1;
      if (log.action === IntegrationScenarioTemplateAuditAction.REJECTED) existed.rejected += 1;
      dayCounter.set(day, existed);
    }

    const actions = Object.entries(actionCounter)
      .map(([action, count]) => ({ action: action as IntegrationScenarioTemplateAuditAction, count }))
      .sort((a, b) => b.count - a.count);

    const perDay = Array.from(dayCounter.entries())
      .map(([date, item]) => ({ date, ...item }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const timeline = logs.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      templateKey: item.templateKey,
      templateName: templateNameMap.get(item.templateKey) || item.templateKey,
      action: item.action,
      operatorId: item.operatorId || '',
      comment: item.comment || '',
    }));

    return {
      timeRangeDays: safeDays,
      summary: {
        totalLogs: logs.length,
        approvedCount: actionCounter[IntegrationScenarioTemplateAuditAction.APPROVED] || 0,
        releasedCount: actionCounter[IntegrationScenarioTemplateAuditAction.RELEASED] || 0,
        rejectedCount: actionCounter[IntegrationScenarioTemplateAuditAction.REJECTED] || 0,
        submittedCount: actionCounter[IntegrationScenarioTemplateAuditAction.SUBMITTED] || 0,
        reminderNotifiedCount: actionCounter[IntegrationScenarioTemplateAuditAction.REMINDER_NOTIFIED] || 0,
        lifecycleUpdatedCount: actionCounter[IntegrationScenarioTemplateAuditAction.LIFECYCLE_UPDATED] || 0,
      },
      actions,
      perDay,
      timeline,
    };
  }

  async notifyTemplateLifecycleReminders(
    dto: NotifyTemplateLifecycleDto,
    userId: string,
  ): Promise<{
    dryRun: boolean;
    totalReminders: number;
    webhook: {
      targets: string[];
      sent: number;
      failed: number;
      details: Array<{ url: string; ok: boolean; status?: number; error?: string }>;
    };
    email: {
      targets: string[];
      sent: number;
      skipped: number;
      gatewayUsed: boolean;
      message: string;
    };
    writeback: {
      total: number;
      logged: number;
      failed: number;
    };
  }> {
    const dryRun = Boolean(dto?.dryRun);
    const reminder = await this.getTemplateLifecycleReminders();

    const webhookUrls = this.normalizeStringList(dto?.webhookUrls, 'LIFECYCLE_NOTIFY_WEBHOOK_URLS');
    const emails = this.normalizeStringList(dto?.emails, 'LIFECYCLE_NOTIFY_EMAILS');

    const payload = {
      event: 'scenario.template.lifecycle.reminder',
      operatorId: userId,
      generatedAt: reminder.generatedAt,
      total: reminder.reminders.length,
      reminders: reminder.reminders,
    };

    const webhookDetails: Array<{ url: string; ok: boolean; status?: number; error?: string }> = [];
    let webhookSent = 0;

    if (!dryRun) {
      for (const url of webhookUrls) {
        try {
          const response = await axios.post(url, payload, {
            timeout: 8000,
            validateStatus: () => true,
          });
          const ok = response.status >= 200 && response.status < 300;
          if (ok) webhookSent += 1;
          webhookDetails.push({ url, ok, status: response.status });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          webhookDetails.push({ url, ok: false, error: message });
        }
      }
    }

    const emailGateway = String(this.configService.get<string>('LIFECYCLE_NOTIFY_EMAIL_GATEWAY') || '').trim();
    let emailSent = 0;
    let emailSkipped = emails.length;
    let gatewayUsed = false;
    let emailMessage = '未配置邮件网关，已跳过邮箱通知';

    if (!dryRun && emails.length && emailGateway) {
      try {
        const response = await axios.post(
          emailGateway,
          {
            event: 'scenario.template.lifecycle.reminder.email',
            to: emails,
            subject: `Scenario 生命周期提醒（${reminder.reminders.length}条）`,
            body: reminder.reminders.map((item) => `- [${item.level}] ${item.templateKey}: ${item.message}`).join('\n'),
            payload,
          },
          { timeout: 8000, validateStatus: () => true },
        );

        gatewayUsed = true;
        if (response.status >= 200 && response.status < 300) {
          emailSent = emails.length;
          emailSkipped = 0;
          emailMessage = '邮件网关发送成功';
        } else {
          emailMessage = `邮件网关返回状态码 ${response.status}`;
        }
      } catch (error) {
        gatewayUsed = true;
        emailMessage = error instanceof Error ? error.message : String(error);
      }
    }

    let writebackLogged = 0;
    let writebackFailed = 0;
    if (!dryRun) {
      const webhookOk = webhookUrls.length === 0 ? false : webhookSent > 0;
      const emailOk = emails.length === 0 ? false : emailSent > 0;
      const channelSummary = [
        `webhook:${webhookOk ? 'ok' : 'fail'}(${webhookSent}/${webhookUrls.length})`,
        `email:${emailOk ? 'ok' : 'skip_or_fail'}(${emailSent}/${emails.length})`,
      ].join(', ');

      for (const item of reminder.reminders) {
        try {
          await this.logTemplateAudit(
            item.templateKey,
            IntegrationScenarioTemplateAuditAction.REMINDER_NOTIFIED,
            userId,
            `提醒发送结果 [${item.type}] ${item.message} | ${channelSummary}`,
            null,
            {
              reminder: item,
              webhook: {
                sent: webhookSent,
                total: webhookUrls.length,
              },
              email: {
                sent: emailSent,
                total: emails.length,
                message: emailMessage,
              },
            },
          );
          writebackLogged += 1;
        } catch {
          writebackFailed += 1;
        }
      }
    }

    return {
      dryRun,
      totalReminders: reminder.reminders.length,
      webhook: {
        targets: webhookUrls,
        sent: dryRun ? 0 : webhookSent,
        failed: dryRun ? 0 : Math.max(0, webhookUrls.length - webhookSent),
        details: webhookDetails,
      },
      email: {
        targets: emails,
        sent: dryRun ? 0 : emailSent,
        skipped: dryRun ? emails.length : emailSkipped,
        gatewayUsed,
        message: dryRun ? 'dryRun=true，未实际发送' : emailMessage,
      },
      writeback: {
        total: reminder.reminders.length,
        logged: dryRun ? 0 : writebackLogged,
        failed: dryRun ? 0 : writebackFailed,
      },
    };
  }

  async getTemplateAuditLogs(templateKey: string, query: QueryTemplateAuditDto): Promise<{
    list: IntegrationScenarioTemplateAudit[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(Math.max(1, Number(query.pageSize || 20)), 100);
    const [list, total] = await this.templateAuditRepository.findAndCount({
      where: { templateKey },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  async getTemplateAuditDiff(templateKey: string, query: QueryTemplateAuditDiffDto): Promise<{
    leftLogId?: string;
    rightLogId?: string;
    totalChanges: number;
    changes: Array<{ path: string; type: 'added' | 'removed' | 'changed'; before?: unknown; after?: unknown }>;
  }> {
    let left: IntegrationScenarioTemplateAudit | null = null;
    let right: IntegrationScenarioTemplateAudit | null = null;

    if (query.leftLogId) {
      left = await this.templateAuditRepository.findOne({ where: { id: query.leftLogId, templateKey } });
    }
    if (query.rightLogId) {
      right = await this.templateAuditRepository.findOne({ where: { id: query.rightLogId, templateKey } });
    }

    if (!left || !right) {
      const latest = await this.templateAuditRepository.find({
        where: { templateKey },
        order: { createdAt: 'DESC' },
        take: 2,
      });
      if (!left) left = latest[0] || null;
      if (!right) right = latest[1] || null;
    }

    if (!left || !right) {
      return { leftLogId: left?.id, rightLogId: right?.id, totalChanges: 0, changes: [] };
    }

    const before = right.afterSnapshot || right.beforeSnapshot || {};
    const after = left.afterSnapshot || left.beforeSnapshot || {};
    const changes = this.diffObjects(before, after);

    return {
      leftLogId: left.id,
      rightLogId: right.id,
      totalChanges: changes.length,
      changes,
    };
  }

  async findOne(id: string): Promise<IntegrationScenario> {
    const scenario = await this.scenarioRepository.findOne({ where: { id } });
    if (!scenario) {
      throw new NotFoundException('集成测试场景不存在');
    }
    return scenario;
  }

  async update(id: string, updateDto: UpdateIntegrationScenarioDto, userId: string): Promise<IntegrationScenario> {
    const scenario = await this.findOne(id);
    const next = this.scenarioRepository.merge(scenario, {
      ...updateDto,
      updatedBy: userId,
      steps: updateDto.steps
        ? (updateDto.steps as unknown as Array<Record<string, unknown>>)
        : scenario.steps,
      defaultVariables: updateDto.defaultVariables || scenario.defaultVariables,
    });
    return this.scenarioRepository.save(next);
  }

  async remove(id: string): Promise<void> {
    const scenario = await this.findOne(id);
    await this.scenarioRepository.remove(scenario);
  }

  async execute(id: string, dto: ExecuteIntegrationScenarioDto, userId: string): Promise<IntegrationScenarioExecution> {
    const scenario = await this.findOne(id);
    const startedAt = new Date();
    const inputVariables = {
      ...(scenario.defaultVariables || {}),
      ...(dto.variables || {}),
    };

    const execution = await this.executionRepository.save(
      this.executionRepository.create({
        scenarioId: scenario.id,
        projectId: scenario.projectId,
        status: IntegrationScenarioExecutionStatus.RUNNING,
        inputVariables,
        startedAt,
        createdBy: userId,
      }),
    );

    try {
      const engineResult = await ScenarioExecutionEngine.run(
        (scenario.steps || []) as unknown as ScenarioStepDto[],
        inputVariables,
        async (request) => {
          const response = await axios({
            method: request.method as Method,
            url: request.url,
            headers: this.toAxiosHeaders(request.headers),
            params: request.params,
            data: request.data,
            timeout: request.timeout,
            validateStatus: () => true,
          });

          return {
            status: response.status,
            headers: response.headers as Record<string, unknown>,
            data: response.data,
          };
        },
      );

      execution.status =
        engineResult.status === 'passed'
          ? IntegrationScenarioExecutionStatus.PASSED
          : IntegrationScenarioExecutionStatus.FAILED;
      execution.outputVariables = engineResult.variables;
      execution.stepResults = engineResult.stepResults as unknown as Array<Record<string, unknown>>;
      execution.totalSteps = engineResult.totalSteps;
      execution.passedSteps = engineResult.passedSteps;
      execution.failedSteps = engineResult.failedSteps;
      execution.errorMessage = engineResult.errorMessage || '';
      execution.durationMs = engineResult.durationMs;
      execution.finishedAt = new Date();
      return this.executionRepository.save(execution);
    } catch (error) {
      execution.status = IntegrationScenarioExecutionStatus.FAILED;
      execution.errorMessage = error instanceof Error ? error.message : String(error);
      execution.finishedAt = new Date();
      execution.durationMs = execution.finishedAt.getTime() - startedAt.getTime();
      return this.executionRepository.save(execution);
    }
  }

  async findExecutions(scenarioId: string, query: QueryScenarioExecutionDto): Promise<{
    list: IntegrationScenarioExecution[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    await this.findOne(scenarioId);
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(Math.max(1, Number(query.pageSize || 10)), 100);

    const [list, total] = await this.executionRepository.findAndCount({
      where: { scenarioId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total, page, pageSize };
  }

  async findExecutionById(id: string): Promise<IntegrationScenarioExecution> {
    const execution = await this.executionRepository.findOne({ where: { id } });
    if (!execution) {
      throw new NotFoundException('场景执行记录不存在');
    }
    return execution;
  }

  private toAxiosHeaders(headers: Record<string, unknown>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers || {})) {
      if (value === undefined || value === null) continue;
      normalized[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return normalized;
  }

  private async resolveTemplate(templateKey: string): Promise<(ScenarioTemplateDefinition & {
    source: 'system' | 'custom';
    status: IntegrationScenarioTemplateStatus;
    lifecycleStatus: IntegrationScenarioTemplateLifecycleStatus;
  }) | null> {
    const custom = await this.templateRepository.findOne({ where: { key: templateKey } });
    if (custom) {
      return {
        key: custom.key,
        name: custom.name,
        description: custom.description,
        category: custom.category,
        defaultVariables: custom.defaultVariables || {},
        steps: custom.steps || [],
        source: 'custom',
        status: custom.status || IntegrationScenarioTemplateStatus.APPROVED,
        lifecycleStatus: custom.lifecycleStatus || IntegrationScenarioTemplateLifecycleStatus.ACTIVE,
      };
    }

    const system = SCENARIO_TEMPLATES.find((item) => item.key === templateKey);
    if (!system) return null;
    return {
      ...system,
      source: 'system',
      status: IntegrationScenarioTemplateStatus.APPROVED,
      lifecycleStatus: IntegrationScenarioTemplateLifecycleStatus.ACTIVE,
    };
  }

  private toTemplateSnapshot(template: IntegrationScenarioTemplate): Record<string, unknown> {
    return {
      key: template.key,
      name: template.name,
      description: template.description,
      category: template.category,
      version: template.version,
      status: template.status,
      lifecycleStatus: template.lifecycleStatus,
      lifecycleComment: template.lifecycleComment,
      deprecatedAt: template.deprecatedAt,
      archivedAt: template.archivedAt,
      releaseTag: template.releaseTag,
      releasedAt: template.releasedAt,
      releaseNote: template.releaseNote,
      reviewComment: template.reviewComment,
      defaultVariables: template.defaultVariables || {},
      steps: template.steps || [],
    };
  }

  private async publishTemplateRelease(
    template: IntegrationScenarioTemplate,
    userId: string,
    reason: string,
  ): Promise<IntegrationScenarioTemplate> {
    const before = this.toTemplateSnapshot(template);
    const releaseTime = new Date();
    const releaseTag = `release/${template.key}/v${Math.max(1, Number(template.version || 1))}-${releaseTime
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14)}`;

    template.releaseTag = releaseTag;
    template.releasedAt = releaseTime;
    template.releaseNote = reason;
    template.updatedBy = userId;

    const saved = await this.templateRepository.save(template);
    await this.logTemplateAudit(
      template.key,
      IntegrationScenarioTemplateAuditAction.RELEASED,
      userId,
      `自动发布: ${reason}`,
      before,
      this.toTemplateSnapshot(saved),
    );

    return saved;
  }

  private async logTemplateAudit(
    templateKey: string,
    action: IntegrationScenarioTemplateAuditAction,
    operatorId: string,
    comment: string,
    beforeSnapshot: Record<string, unknown> | null,
    afterSnapshot: Record<string, unknown> | null,
  ): Promise<void> {
    await this.templateAuditRepository.save(
      this.templateAuditRepository.create({
        templateKey,
        action,
        operatorId,
        comment,
        beforeSnapshot: beforeSnapshot || undefined,
        afterSnapshot: afterSnapshot || undefined,
      }),
    );
  }

  private diffObjects(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Array<{ path: string; type: 'added' | 'removed' | 'changed'; before?: unknown; after?: unknown }> {
    const beforeFlat = this.flattenObject(before);
    const afterFlat = this.flattenObject(after);
    const allKeys = new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)]);
    const changes: Array<{ path: string; type: 'added' | 'removed' | 'changed'; before?: unknown; after?: unknown }> = [];

    for (const key of Array.from(allKeys).sort()) {
      const hasBefore = key in beforeFlat;
      const hasAfter = key in afterFlat;
      if (!hasBefore && hasAfter) {
        changes.push({ path: key, type: 'added', after: afterFlat[key] });
        continue;
      }
      if (hasBefore && !hasAfter) {
        changes.push({ path: key, type: 'removed', before: beforeFlat[key] });
        continue;
      }
      if (JSON.stringify(beforeFlat[key]) !== JSON.stringify(afterFlat[key])) {
        changes.push({ path: key, type: 'changed', before: beforeFlat[key], after: afterFlat[key] });
      }
    }
    return changes;
  }

  private flattenObject(source: unknown, prefix: string = ''): Record<string, unknown> {
    if (source === null || source === undefined) {
      return prefix ? { [prefix]: source } : {};
    }
    if (Array.isArray(source)) {
      const acc: Record<string, unknown> = {};
      source.forEach((item, index) => {
        const key = `${prefix}[${index}]`;
        Object.assign(acc, this.flattenObject(item, key));
      });
      if (!source.length && prefix) acc[prefix] = [];
      return acc;
    }
    if (typeof source !== 'object') {
      return prefix ? { [prefix]: source } : { value: source };
    }

    const entries = Object.entries(source as Record<string, unknown>);
    if (!entries.length && prefix) {
      return { [prefix]: {} };
    }
    const acc: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      const next = prefix ? `${prefix}.${key}` : key;
      Object.assign(acc, this.flattenObject(value, next));
    }
    return acc;
  }

  private evaluateTemplateQuality(
    steps: Array<Record<string, unknown>>,
    defaultVariables: Record<string, unknown>,
    businessLine: string | undefined,
    policyMap: Map<string, {
      source: 'default' | 'custom';
      enabled: boolean;
      weights: {
        structure: number;
        assertions: number;
        variableDependency: number;
        maintainability: number;
      };
    }>,
  ): {
    qualityScore: number;
    qualityLevel: 'high' | 'medium' | 'low';
    qualityBreakdown: {
      structure: number;
      assertions: number;
      variableDependency: number;
      maintainability: number;
    };
    qualityPolicy: {
      businessLine: string;
      source: 'default' | 'custom';
      weights: {
        structure: number;
        assertions: number;
        variableDependency: number;
        maintainability: number;
      };
    };
  } {
    const totalSteps = Math.max(0, steps.length);
    const stepLike = steps as Array<{
      assertions?: unknown[];
      extractors?: Array<{ name?: string }>;
      branchRules?: unknown[];
      onPassedStepIndex?: number;
      onFailedStepIndex?: number;
    }>;

    const stepsWithAssertions = stepLike.filter((item) => Array.isArray(item.assertions) && item.assertions.length > 0).length;
    const totalAssertions = stepLike.reduce((sum, item) => sum + (Array.isArray(item.assertions) ? item.assertions.length : 0), 0);
    const totalExtractors = stepLike.reduce((sum, item) => sum + (Array.isArray(item.extractors) ? item.extractors.length : 0), 0);
    const branchSteps = stepLike.filter((item) =>
      (Array.isArray(item.branchRules) && item.branchRules.length > 0)
      || Number.isInteger(item.onPassedStepIndex)
      || Number.isInteger(item.onFailedStepIndex),
    ).length;

    const defaultVarKeys = new Set(Object.keys(defaultVariables || {}));
    const extractedVarKeys = new Set(
      stepLike.flatMap((item) => (Array.isArray(item.extractors) ? item.extractors.map((e) => String(e?.name || '').trim()).filter(Boolean) : [])),
    );

    const referencedVars = new Set<string>();
    for (const step of steps) {
      const json = JSON.stringify(step || {});
      const matches = json.match(/\{\{\s*([^{}\s]+)\s*\}\}/g) || [];
      for (const raw of matches) {
        const key = raw.replace(/\{\{|\}\}|\s/g, '');
        if (key) referencedVars.add(key);
      }
    }

    let unresolvedVars = 0;
    for (const key of referencedVars) {
      const root = key.split('.')[0];
      if (!defaultVarKeys.has(root) && !extractedVarKeys.has(root)) {
        unresolvedVars += 1;
      }
    }

    const structure = totalSteps === 0
      ? 0
      : Math.min(100, Math.round(55 + Math.min(45, totalSteps * 12 + totalExtractors * 2)));

    const assertions = totalSteps === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((stepsWithAssertions / totalSteps) * 85 + Math.min(15, totalAssertions * 2))));

    const variableDependencyBase = referencedVars.size === 0 ? 70 : Math.max(0, 100 - Math.round((unresolvedVars / referencedVars.size) * 100));
    const variableDependency = Math.max(0, Math.min(100, variableDependencyBase));

    const avgAssertions = totalSteps === 0 ? 0 : totalAssertions / totalSteps;
    const assertionDensityPenalty = avgAssertions > 4 ? Math.min(20, Math.round((avgAssertions - 4) * 4)) : 0;
    const branchPenalty = Math.min(15, branchSteps * 3);
    const maintainability = Math.max(0, Math.min(100, 90 - assertionDensityPenalty - branchPenalty));

    const policy = policyMap.get(String(businessLine || 'general')) || policyMap.get('general') || {
      source: 'default' as const,
      enabled: true,
      weights: {
        structure: 0.25,
        assertions: 0.35,
        variableDependency: 0.25,
        maintainability: 0.15,
      },
    };

    const weights = this.normalizeQualityWeights(policy.weights);
    const weightSum = weights.structure + weights.assertions + weights.variableDependency + weights.maintainability;
    const normalized = weightSum > 0
      ? {
          structure: weights.structure / weightSum,
          assertions: weights.assertions / weightSum,
          variableDependency: weights.variableDependency / weightSum,
          maintainability: weights.maintainability / weightSum,
        }
      : {
          structure: 0.25,
          assertions: 0.35,
          variableDependency: 0.25,
          maintainability: 0.15,
        };

    const qualityScore = Math.round(
      structure * normalized.structure
      + assertions * normalized.assertions
      + variableDependency * normalized.variableDependency
      + maintainability * normalized.maintainability,
    );

    const qualityLevel: 'high' | 'medium' | 'low' = qualityScore >= 80 ? 'high' : qualityScore >= 60 ? 'medium' : 'low';

    return {
      qualityScore,
      qualityLevel,
      qualityBreakdown: {
        structure,
        assertions,
        variableDependency,
        maintainability,
      },
      qualityPolicy: {
        businessLine: String(businessLine || 'general'),
        source: policy.source,
        weights,
      },
    };
  }

  private getDefaultQualityPolicyMap(): Map<string, {
    description: string;
    weights: {
      structure: number;
      assertions: number;
      variableDependency: number;
      maintainability: number;
    };
  }> {
    return new Map([
      ['general', {
        description: '通用质量评分策略',
        weights: { structure: 0.25, assertions: 0.35, variableDependency: 0.25, maintainability: 0.15 },
      }],
      ['ecommerce', {
        description: '电商场景更关注断言与变量依赖',
        weights: { structure: 0.2, assertions: 0.4, variableDependency: 0.3, maintainability: 0.1 },
      }],
      ['fulfillment', {
        description: '履约场景更关注结构完整性与可维护性',
        weights: { structure: 0.3, assertions: 0.3, variableDependency: 0.2, maintainability: 0.2 },
      }],
      ['marketing', {
        description: '营销场景重断言完整度与稳定性',
        weights: { structure: 0.2, assertions: 0.45, variableDependency: 0.2, maintainability: 0.15 },
      }],
    ]);
  }

  private async getQualityPolicyMap(): Promise<Map<string, {
    source: 'default' | 'custom';
    enabled: boolean;
    weights: {
      structure: number;
      assertions: number;
      variableDependency: number;
      maintainability: number;
    };
  }>> {
    const defaults = this.getDefaultQualityPolicyMap();
    const map = new Map<string, {
      source: 'default' | 'custom';
      enabled: boolean;
      weights: {
        structure: number;
        assertions: number;
        variableDependency: number;
        maintainability: number;
      };
    }>();

    for (const [key, value] of defaults.entries()) {
      map.set(key, {
        source: 'default',
        enabled: true,
        weights: this.normalizeQualityWeights(value.weights),
      });
    }

    const customs = await this.qualityPolicyRepository.find({ where: { enabled: true } });
    for (const item of customs) {
      map.set(item.businessLine, {
        source: 'custom',
        enabled: item.enabled,
        weights: this.normalizeQualityWeights(item.weights),
      });
    }

    return map;
  }

  private normalizeQualityWeights(weights: {
    structure?: number;
    assertions?: number;
    variableDependency?: number;
    maintainability?: number;
  }): {
    structure: number;
    assertions: number;
    variableDependency: number;
    maintainability: number;
  } {
    return {
      structure: Math.max(0, Number(weights?.structure || 0)),
      assertions: Math.max(0, Number(weights?.assertions || 0)),
      variableDependency: Math.max(0, Number(weights?.variableDependency || 0)),
      maintainability: Math.max(0, Number(weights?.maintainability || 0)),
    };
  }

  private getDefaultGovernanceRuleMap(): Map<string, {
    description: string;
    enabled: boolean;
    autoRejectPendingReviewEnabled: boolean;
    pendingReviewTimeoutDays: number;
    autoDeprecatedRejectedEnabled: boolean;
    rejectedNotFixedDays: number;
    autoReleaseApprovedEnabled: boolean;
    autoDeprecatedLowQualityEnabled: boolean;
    lowQualityThreshold: number;
  }> {
    return new Map([
      ['general', {
        description: '通用治理规则：待审核超时自动驳回、驳回超时自动废弃',
        enabled: true,
        autoRejectPendingReviewEnabled: true,
        pendingReviewTimeoutDays: 2,
        autoDeprecatedRejectedEnabled: true,
        rejectedNotFixedDays: 14,
        autoReleaseApprovedEnabled: false,
        autoDeprecatedLowQualityEnabled: false,
        lowQualityThreshold: 60,
      }],
      ['ecommerce', {
        description: '电商治理规则：审核时效更严格',
        enabled: true,
        autoRejectPendingReviewEnabled: true,
        pendingReviewTimeoutDays: 2,
        autoDeprecatedRejectedEnabled: true,
        rejectedNotFixedDays: 10,
        autoReleaseApprovedEnabled: false,
        autoDeprecatedLowQualityEnabled: false,
        lowQualityThreshold: 65,
      }],
      ['fulfillment', {
        description: '履约治理规则：关注稳定性与整改闭环',
        enabled: true,
        autoRejectPendingReviewEnabled: true,
        pendingReviewTimeoutDays: 3,
        autoDeprecatedRejectedEnabled: true,
        rejectedNotFixedDays: 14,
        autoReleaseApprovedEnabled: false,
        autoDeprecatedLowQualityEnabled: false,
        lowQualityThreshold: 60,
      }],
      ['marketing', {
        description: '营销治理规则：支持低质量自动废弃（默认关闭）',
        enabled: true,
        autoRejectPendingReviewEnabled: true,
        pendingReviewTimeoutDays: 2,
        autoDeprecatedRejectedEnabled: true,
        rejectedNotFixedDays: 10,
        autoReleaseApprovedEnabled: false,
        autoDeprecatedLowQualityEnabled: false,
        lowQualityThreshold: 70,
      }],
    ]);
  }

  private async getGovernanceRuleMap(): Promise<Map<string, {
    description: string;
    enabled: boolean;
    autoRejectPendingReviewEnabled: boolean;
    pendingReviewTimeoutDays: number;
    autoDeprecatedRejectedEnabled: boolean;
    rejectedNotFixedDays: number;
    autoReleaseApprovedEnabled: boolean;
    autoDeprecatedLowQualityEnabled: boolean;
    lowQualityThreshold: number;
  }>> {
    const map = new Map(this.getDefaultGovernanceRuleMap());
    const customs = await this.governanceRuleRepository.find();
    for (const item of customs) {
      map.set(item.businessLine, {
        description: item.description || map.get(item.businessLine)?.description || '',
        enabled: item.enabled,
        autoRejectPendingReviewEnabled: item.autoRejectPendingReviewEnabled,
        pendingReviewTimeoutDays: item.pendingReviewTimeoutDays,
        autoDeprecatedRejectedEnabled: item.autoDeprecatedRejectedEnabled,
        rejectedNotFixedDays: item.rejectedNotFixedDays,
        autoReleaseApprovedEnabled: item.autoReleaseApprovedEnabled,
        autoDeprecatedLowQualityEnabled: item.autoDeprecatedLowQualityEnabled,
        lowQualityThreshold: item.lowQualityThreshold,
      });
    }
    return map;
  }

  private normalizeStringList(values: string[] | undefined, envKey: string): string[] {
    if (Array.isArray(values) && values.length) {
      return values.map((item) => String(item || '').trim()).filter(Boolean);
    }

    const raw = String(this.configService.get<string>(envKey) || '').trim();
    if (!raw) return [];
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  }
}
