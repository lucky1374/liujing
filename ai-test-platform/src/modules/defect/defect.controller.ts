import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DefectService } from './defect.service';
import { CreateDefectDto, UpdateDefectDto, QueryDefectDto } from './dto/defect.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('缺陷管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('defects')
export class DefectController {
  constructor(private readonly defectService: DefectService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER, UserRole.DEVELOPER)
  @ApiOperation({ description: '创建缺陷' })
  create(@Body() createDto: CreateDefectDto, @Request() req: any) {
    return this.defectService.create(createDto, req.user.userId);
  }

  @Post('from-execution/:executionId')
  @Roles(UserRole.ADMIN, UserRole.TESTER, UserRole.DEVELOPER)
  @ApiOperation({ description: '从执行记录转缺陷' })
  createFromExecution(@Param('executionId') executionId: string, @Request() req: any) {
    return this.defectService.createFromExecution(executionId, req.user.userId);
  }

  @Get()
  @ApiOperation({ description: '获取缺陷列表' })
  findAll(@Query() query: QueryDefectDto) {
    return this.defectService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ description: '获取缺陷统计' })
  getStatistics(@Query('projectId') projectId?: string) {
    return this.defectService.getStatistics(projectId);
  }

  @Get(':id')
  @ApiOperation({ description: '获取缺陷详情' })
  findOne(@Param('id') id: string) {
    return this.defectService.findOne(id);
  }

  @Post(':id/analyze')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: 'AI分析缺陷' })
  analyzeByAi(@Param('id') id: string) {
    return this.defectService.analyzeByAi(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER, UserRole.DEVELOPER)
  @ApiOperation({ description: '更新缺陷' })
  update(@Param('id') id: string, @Body() updateDto: UpdateDefectDto) {
    return this.defectService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ description: '删除缺陷' })
  remove(@Param('id') id: string) {
    return this.defectService.remove(id);
  }
}
