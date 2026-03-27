import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestCase } from './entities/test-case.entity';
import { TestCaseService } from './test-case.service';
import { TestCaseController } from './test-case.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestCase]),
    AiModule,
  ],
  providers: [TestCaseService],
  controllers: [TestCaseController],
  exports: [TestCaseService],
})
export class TestCaseModule {}
