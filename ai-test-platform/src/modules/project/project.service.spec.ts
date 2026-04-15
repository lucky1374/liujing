import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';
import { ProjectReleaseGateAudit } from './entities/project-release-gate-audit.entity';

type ProjectRepoMock = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  remove: jest.Mock;
  findAndCount: jest.Mock;
};

type AuditRepoMock = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
};

const makeProjectRepo = (): ProjectRepoMock => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  findAndCount: jest.fn(),
});

const makeAuditRepo = (): AuditRepoMock => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('ProjectService release gate settings', () => {
  let service: ProjectService;
  let projectRepo: ProjectRepoMock;
  let auditRepo: AuditRepoMock;

  beforeEach(() => {
    projectRepo = makeProjectRepo();
    auditRepo = makeAuditRepo();
    service = new ProjectService(projectRepo as any, auditRepo as any);
  });

  it('returns default release gate settings when project has no saved settings', async () => {
    projectRepo.findOne.mockResolvedValue({
      id: 'p-1',
      releaseGateSettings: null,
    } as Project);

    const result = await service.getReleaseGateSettings('p-1');

    expect(result).toEqual({
      projectId: 'p-1',
      minPassRate: 95,
      minAiAdoptionRate: 50,
      minAiSampleSize: 5,
      rectificationOwnerDefault: '',
      rectificationPriorityDefault: 'P1',
      rectificationTagsDefault: ['release-gate', 'ai-quality'],
      updatedAt: null,
      updatedBy: null,
    });
  });

  it('updates project-level rectification defaults and writes audit', async () => {
    const project = {
      id: 'p-2',
      releaseGateSettings: {
        minPassRate: 96,
        minAiAdoptionRate: 55,
        minAiSampleSize: 8,
      },
    } as Project;

    projectRepo.findOne.mockResolvedValue(project);
    projectRepo.save.mockImplementation(async (value: Project) => value);
    auditRepo.create.mockImplementation((value: Partial<ProjectReleaseGateAudit>) => value);
    auditRepo.save.mockResolvedValue(undefined);

    const result = await service.updateReleaseGateSettings(
      'p-2',
      {
        rectificationOwnerDefault: 'alice',
        rectificationPriorityDefault: 'P0',
        rectificationTagsDefault: ['release-gate', 'core-risk'],
        changeReason: 'phase2 closure',
      },
      'u-1',
    );

    expect(projectRepo.save).toHaveBeenCalledTimes(1);
    expect(project.releaseGateSettings?.rectificationOwnerDefault).toBe('alice');
    expect(project.releaseGateSettings?.rectificationPriorityDefault).toBe('P0');
    expect(project.releaseGateSettings?.rectificationTagsDefault).toEqual(['release-gate', 'core-risk']);
    expect(project.releaseGateSettings?.updatedBy).toBe('u-1');

    expect(auditRepo.create).toHaveBeenCalledTimes(1);
    const createdAudit = auditRepo.create.mock.calls[0][0] as ProjectReleaseGateAudit;
    expect(createdAudit.projectId).toBe('p-2');
    expect(createdAudit.operatorId).toBe('u-1');
    expect(createdAudit.comment).toBe('phase2 closure');
    expect((createdAudit.nextSettings as Record<string, unknown>).rectificationOwnerDefault).toBe('alice');

    expect(result.projectId).toBe('p-2');
    expect(result.rectificationOwnerDefault).toBe('alice');
    expect(result.rectificationPriorityDefault).toBe('P0');
    expect(result.rectificationTagsDefault).toEqual(['release-gate', 'core-risk']);
  });
});
