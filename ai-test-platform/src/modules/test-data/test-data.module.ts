import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestData } from './entities/test-data.entity';
import { TestDataService } from './test-data.service';
import { TestDataController } from './test-data.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TestData])],
  providers: [TestDataService],
  controllers: [TestDataController],
  exports: [TestDataService],
})
export class TestDataModule {}
