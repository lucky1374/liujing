import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestScriptService } from './test-script.service';
import { CreateTestScriptDto, UpdateTestScriptDto, QueryTestScriptDto } from './dto/test-script.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('测试脚本')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-scripts')
export class TestScriptController {
  constructor(private readonly scriptService: TestScriptService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '创建测试脚本' })
  create(@Body() createDto: CreateTestScriptDto, @Request() req: any) {
    return this.scriptService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ description: '获取脚本列表' })
  findAll(@Query() query: QueryTestScriptDto) {
    return this.scriptService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ description: '获取脚本详情' })
  findOne(@Param('id') id: string) {
    return this.scriptService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '更新脚本' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTestScriptDto, @Request() req: any) {
    return this.scriptService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '删除脚本' })
  remove(@Param('id') id: string) {
    return this.scriptService.remove(id);
  }

  @Post('generate-by-ai')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: 'AI生成测试脚本' })
  generateByAi(
    @Body('testCaseId') testCaseId: string,
    @Body('scriptType') scriptType: 'interface' | 'ui',
    @Request() req: any
  ) {
    return this.scriptService.generateByAi(testCaseId, scriptType, req.user.userId);
  }
}
