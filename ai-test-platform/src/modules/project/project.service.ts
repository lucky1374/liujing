import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto, QueryProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
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
}
