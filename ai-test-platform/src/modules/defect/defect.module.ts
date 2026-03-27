import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Defect } from './entities/defect.entity';
import { DefectService } from './defect.service';
import { DefectController } from './defect.controller';
import { AiModule } from '../ai/ai.module';
import { TestExecution } from '../test-task/entities/test-execution.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Defect, TestExecution]), AiModule],
  providers: [DefectService],
  controllers: [DefectController],
  exports: [DefectService],
})
export class DefectModule {}
