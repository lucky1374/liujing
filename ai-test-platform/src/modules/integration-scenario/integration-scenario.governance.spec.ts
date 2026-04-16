import { IntegrationScenarioService } from './integration-scenario.service';
import { IntegrationScenarioTemplateStatus, IntegrationScenarioTemplateLifecycleStatus } from './entities/integration-scenario-template.entity';

const makeRepo = () => ({
  create: jest.fn((v) => v),
  save: jest.fn(async (v) => v),
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  merge: jest.fn((a, b) => ({ ...a, ...b })),
  createQueryBuilder: jest.fn(),
  remove: jest.fn(),
});

describe('IntegrationScenarioService governance rules', () => {
  let service: IntegrationScenarioService;
  let scenarioRepo: ReturnType<typeof makeRepo>;
  let executionRepo: ReturnType<typeof makeRepo>;
  let templateRepo: ReturnType<typeof makeRepo>;
  let auditRepo: ReturnType<typeof makeRepo>;
  let qualityPolicyRepo: ReturnType<typeof makeRepo>;
  let governanceRuleRepo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    scenarioRepo = makeRepo();
    executionRepo = makeRepo();
    templateRepo = makeRepo();
    auditRepo = makeRepo();
    qualityPolicyRepo = makeRepo();
    governanceRuleRepo = makeRepo();

    service = new IntegrationScenarioService(
      scenarioRepo as any,
      executionRepo as any,
      templateRepo as any,
      auditRepo as any,
      qualityPolicyRepo as any,
      governanceRuleRepo as any,
      { get: jest.fn(() => '') } as any,
    );

    qualityPolicyRepo.find.mockResolvedValue([]);
    governanceRuleRepo.find.mockResolvedValue([]);
  });

  it('dryRun should not persist transitions', async () => {
    const now = Date.now();
    templateRepo.find.mockResolvedValue([
      {
        id: 'tpl-1',
        key: 'tpl.pending.timeout',
        name: 'pending timeout',
        category: 'general',
        status: IntegrationScenarioTemplateStatus.PENDING_REVIEW,
        lifecycleStatus: IntegrationScenarioTemplateLifecycleStatus.ACTIVE,
        submittedAt: new Date(now - 3 * 24 * 3600 * 1000),
        defaultVariables: {},
        steps: [],
      },
    ]);

    const result = await service.executeGovernanceRules({ dryRun: true }, 'u-1');

    expect(result.dryRun).toBe(true);
    expect(result.matchedCount).toBeGreaterThanOrEqual(1);
    expect(result.appliedCount).toBe(0);
    expect(templateRepo.save).not.toHaveBeenCalled();
    expect(auditRepo.save).not.toHaveBeenCalled();
  });

  it('execute mode should persist transition and write audit', async () => {
    const now = Date.now();
    const template = {
      id: 'tpl-2',
      key: 'tpl.pending.timeout.apply',
      name: 'pending timeout apply',
      category: 'general',
      status: IntegrationScenarioTemplateStatus.PENDING_REVIEW,
      lifecycleStatus: IntegrationScenarioTemplateLifecycleStatus.ACTIVE,
      submittedAt: new Date(now - 3 * 24 * 3600 * 1000),
      defaultVariables: {},
      steps: [],
      updatedBy: '',
      reviewComment: '',
      reviewedBy: '',
      reviewedAt: null,
    };
    templateRepo.find.mockResolvedValue([template]);

    const result = await service.executeGovernanceRules({ dryRun: false }, 'u-2');

    expect(result.dryRun).toBe(false);
    expect(result.matchedCount).toBe(1);
    expect(result.appliedCount).toBe(1);
    expect(template.status).toBe(IntegrationScenarioTemplateStatus.REJECTED);
    expect(template.updatedBy).toBe('u-2');
    expect(templateRepo.save).toHaveBeenCalledTimes(1);
    expect(auditRepo.save).toHaveBeenCalledTimes(1);
  });
});
