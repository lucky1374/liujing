import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestReport } from './entities/test-report.entity';
import { TestTask } from '../test-task/entities/test-task.entity';
import { TestExecution } from '../test-task/entities/test-execution.entity';
import { Defect } from '../defect/entities/defect.entity';
import { TestReportService } from './test-report.service';
import { TestReportController } from './test-report.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([TestReport, TestTask, TestExecution, Defect]), AiModule],
  providers: [TestReportService],
  controllers: [TestReportController],
  exports: [TestReportService],
})
export class TestReportModule {}
