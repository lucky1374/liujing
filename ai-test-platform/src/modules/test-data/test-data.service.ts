import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestData, TestDataStatus } from './entities/test-data.entity';
import { CreateTestDataDto, UpdateTestDataDto, QueryTestDataDto } from './dto/test-data.dto';

@Injectable()
export class TestDataService {
  constructor(
    @InjectRepository(TestData)
    private dataRepository: Repository<TestData>,
  ) {}

  async create(createDto: CreateTestDataDto, userId: string): Promise<TestData> {
    const data = this.dataRepository.create({
      ...createDto,
      createdBy: userId,
    });
    return this.dataRepository.save(data);
  }

  async findAll(query: QueryTestDataDto): Promise<{ list: TestData[]; total: number }> {
    const { page = 1, pageSize = 10, module, type, status } = query;
    const where: any = {};

    if (module) where.module = module;
    if (type) where.type = type;
    if (status) where.status = status;

    const [list, total] = await this.dataRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total };
  }

  async findOne(id: string): Promise<TestData> {
    const data = await this.dataRepository.findOne({ where: { id } });
    if (!data) {
      throw new NotFoundException('测试数据不存在');
    }
    return data;
  }

  async update(id: string, updateDto: UpdateTestDataDto, userId: string): Promise<TestData> {
    const data = await this.findOne(id);
    Object.assign(data, updateDto, { updatedBy: userId });
    return this.dataRepository.save(data);
  }

  async remove(id: string): Promise<void> {
    const data = await this.findOne(id);
    await this.dataRepository.remove(data);
  }
}
