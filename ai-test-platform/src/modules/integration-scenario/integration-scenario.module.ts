import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationScenarioController } from './integration-scenario.controller';
import { IntegrationScenarioService } from './integration-scenario.service';
import { IntegrationScenario } from './entities/integration-scenario.entity';
import { IntegrationScenarioExecution } from './entities/integration-scenario-execution.entity';
import { IntegrationScenarioTemplate } from './entities/integration-scenario-template.entity';
import { IntegrationScenarioTemplateAudit } from './entities/integration-scenario-template-audit.entity';
import { IntegrationScenarioQualityPolicy } from './entities/integration-scenario-quality-policy.entity';
import { IntegrationScenarioGovernanceRule } from './entities/integration-scenario-governance-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegrationScenario,
      IntegrationScenarioExecution,
      IntegrationScenarioTemplate,
      IntegrationScenarioTemplateAudit,
      IntegrationScenarioQualityPolicy,
      IntegrationScenarioGovernanceRule,
    ]),
  ],
  providers: [IntegrationScenarioService],
  controllers: [IntegrationScenarioController],
  exports: [IntegrationScenarioService],
})
export class IntegrationScenarioModule {}
