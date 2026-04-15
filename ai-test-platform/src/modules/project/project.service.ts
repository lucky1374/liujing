import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto, QueryProjectDto, UpdateProjectDto, UpdateReleaseGateSettingsDto } from './dto/project.dto';
import { ProjectReleaseGateAudit } from './entities/project-release-gate-audit.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectReleaseGateAudit)
    private readonly releaseGateAuditRepository: Repository<ProjectReleaseGateAudit>,
  ) {}

  create(createDto: CreateProjectDto) {
    const project = this.projectRepository.create(createDto);
    return this.projectRepository.save(project);
  }

  async findAll(query: QueryProjectDto): Promise<{ list: Project[]; total: number }> {
    const { page = 1, pageSize = 10, status, keyword } = query;
    const where: any = {};

    if (status) where.status = status;
    if (keyword) where.name = Like(`%${keyword}%`);

    const [list, total] = await this.projectRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total };
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return project;
  }

  async update(id: string, updateDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, updateDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepository.remove(project);
  }

  async getReleaseGateSettings(id: string) {
    const project = await this.findOne(id);
    const saved = (project.releaseGateSettings && typeof project.releaseGateSettings === 'object')
      ? project.releaseGateSettings
      : {};
    return {
      projectId: project.id,
      minPassRate: Number(saved.minPassRate || 95),
      minAiAdoptionRate: Number(saved.minAiAdoptionRate || 50),
      minAiSampleSize: Number(saved.minAiSampleSize || 5),
      rectificationOwnerDefault: String(saved.rectificationOwnerDefault || ''),
      rectificationPriorityDefault: String(saved.rectificationPriorityDefault || 'P1'),
      rectificationTagsDefault: Array.isArray(saved.rectificationTagsDefault)
        ? saved.rectificationTagsDefault.map((item: any) => String(item).trim()).filter(Boolean)
        : ['release-gate', 'ai-quality'],
      updatedAt: saved.updatedAt || null,
      updatedBy: saved.updatedBy || null,
    };
  }

  async updateReleaseGateSettings(id: string, dto: UpdateReleaseGateSettingsDto, userId: string) {
    const project = await this.findOne(id);
    const current = (project.releaseGateSettings && typeof project.releaseGateSettings === 'object')
      ? project.releaseGateSettings
      : {};
    const previous = {
      minPassRate: Number(current.minPassRate || 95),
      minAiAdoptionRate: Number(current.minAiAdoptionRate || 50),
      minAiSampleSize: Number(current.minAiSampleSize || 5),
      rectificationOwnerDefault: String(current.rectificationOwnerDefault || ''),
      rectificationPriorityDefault: String(current.rectificationPriorityDefault || 'P1'),
      rectificationTagsDefault: Array.isArray(current.rectificationTagsDefault)
        ? current.rectificationTagsDefault.map((item: any) => String(item).trim()).filter(Boolean)
        : ['release-gate', 'ai-quality'],
      updatedAt: current.updatedAt || null,
      updatedBy: current.updatedBy || null,
    };
    const nextTags = Array.isArray(dto.rectificationTagsDefault)
      ? dto.rectificationTagsDefault.map((item) => String(item).trim()).filter(Boolean)
      : undefined;
    project.releaseGateSettings = {
      ...current,
      ...(dto.minPassRate !== undefined ? { minPassRate: Number(dto.minPassRate) } : {}),
      ...(dto.minAiAdoptionRate !== undefined ? { minAiAdoptionRate: Number(dto.minAiAdoptionRate) } : {}),
      ...(dto.minAiSampleSize !== undefined ? { minAiSampleSize: Number(dto.minAiSampleSize) } : {}),
      ...(dto.rectificationOwnerDefault !== undefined
        ? { rectificationOwnerDefault: String(dto.rectificationOwnerDefault || '').trim() }
        : {}),
      ...(dto.rectificationPriorityDefault !== undefined
        ? { rectificationPriorityDefault: dto.rectificationPriorityDefault }
        : {}),
      ...(nextTags !== undefined ? { rectificationTagsDefault: nextTags } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    await this.projectRepository.save(project);

    const next = {
      minPassRate: Number(project.releaseGateSettings.minPassRate || 95),
      minAiAdoptionRate: Number(project.releaseGateSettings.minAiAdoptionRate || 50),
      minAiSampleSize: Number(project.releaseGateSettings.minAiSampleSize || 5),
      rectificationOwnerDefault: String(project.releaseGateSettings.rectificationOwnerDefault || ''),
      rectificationPriorityDefault: String(project.releaseGateSettings.rectificationPriorityDefault || 'P1'),
      rectificationTagsDefault: Array.isArray(project.releaseGateSettings.rectificationTagsDefault)
        ? project.releaseGateSettings.rectificationTagsDefault.map((item: any) => String(item).trim()).filter(Boolean)
        : ['release-gate', 'ai-quality'],
      updatedAt: project.releaseGateSettings.updatedAt || null,
      updatedBy: project.releaseGateSettings.updatedBy || null,
    };

    const audit = this.releaseGateAuditRepository.create({
      projectId: project.id,
      operatorId: userId,
      comment: String(dto.changeReason || '').trim(),
      previousSettings: previous,
      nextSettings: next,
    });
    await this.releaseGateAuditRepository.save(audit);

    return this.getReleaseGateSettings(id);
  }

  async getReleaseGateSettingsAudits(id: string, limit?: number) {
    await this.findOne(id);
    const size = Math.min(Math.max(1, Number(limit || 20)), 100);
    return this.releaseGateAuditRepository.find({
      where: { projectId: id },
      order: { createdAt: 'DESC' },
      take: size,
    });
  }
}
