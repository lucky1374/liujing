import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Environment } from './entities/environment.entity';
import { CreateEnvironmentDto, UpdateEnvironmentDto } from './dto/environment.dto';

@Injectable()
export class EnvironmentService {
  constructor(
    @InjectRepository(Environment)
    private envRepository: Repository<Environment>,
  ) {}

  async create(createDto: CreateEnvironmentDto): Promise<Environment> {
    const env = this.envRepository.create(createDto);
    return this.envRepository.save(env);
  }

  async findAll(projectId?: string): Promise<Environment[]> {
    return this.envRepository.find({
      where: projectId ? { projectId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Environment> {
    const env = await this.envRepository.findOne({ where: { id } });
    if (!env) {
      throw new NotFoundException('环境不存在');
    }
    return env;
  }

  async findByType(type: string): Promise<Environment[]> {
    return this.envRepository.find({ where: { type: type as any } });
  }

  async findByTypeAndProject(type: string, projectId?: string): Promise<Environment | null> {
    return this.envRepository.findOne({
      where: {
        type: type as any,
        ...(projectId ? { projectId } : {}),
      },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async update(id: string, updateDto: UpdateEnvironmentDto): Promise<Environment> {
    const env = await this.findOne(id);
    Object.assign(env, updateDto);
    return this.envRepository.save(env);
  }

  async remove(id: string): Promise<void> {
    const env = await this.findOne(id);
    await this.envRepository.remove(env);
  }
}
