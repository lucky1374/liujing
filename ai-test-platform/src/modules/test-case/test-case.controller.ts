import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestCaseService } from './test-case.service';
import { CreateTestCaseDto, UpdateTestCaseDto, QueryTestCaseDto } from './dto/test-case.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('测试用例')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-cases')
export class TestCaseController {
  constructor(private readonly testCaseService: TestCaseService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '创建测试用例' })
  create(@Body() createDto: CreateTestCaseDto, @Request() req: any) {
    return this.testCaseService.create(createDto, req.user.userId);
  }

  @Post('generate-by-ai')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: 'AI生成测试用例' })
  generateByAi(@Body('prompt') prompt: string, @Body('projectId') projectId: string, @Request() req: any) {
    return this.testCaseService.generateByAi(prompt, req.user.userId, projectId);
  }

  @Get()
  @ApiOperation({ description: '获取测试用例列表' })
  findAll(@Query() query: QueryTestCaseDto) {
    return this.testCaseService.findAll(query);
  }

  @Get('modules')
  @ApiOperation({ description: '获取所有模块' })
  getModules() {
    return this.testCaseService.getModules();
  }

  @Get(':id')
  @ApiOperation({ description: '获取测试用例详情' })
  findOne(@Param('id') id: string) {
    return this.testCaseService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '更新测试用例' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTestCaseDto, @Request() req: any) {
    return this.testCaseService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '删除测试用例' })
  remove(@Param('id') id: string) {
    return this.testCaseService.remove(id);
  }
}
