import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnvironmentService } from './environment.service';
import { CreateEnvironmentDto, UpdateEnvironmentDto } from './dto/environment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('环境管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('environments')
export class EnvironmentController {
  constructor(private readonly envService: EnvironmentService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '创建环境' })
  create(@Body() createDto: CreateEnvironmentDto) {
    return this.envService.create(createDto);
  }

  @Get()
  @ApiOperation({ description: '获取环境列表' })
  findAll(@Query('projectId') projectId?: string) {
    return this.envService.findAll(projectId);
  }

  @Get('type/:type')
  @ApiOperation({ description: '按类型获取环境' })
  findByType(@Param('type') type: string) {
    return this.envService.findByType(type);
  }

  @Get(':id')
  @ApiOperation({ description: '获取环境详情' })
  findOne(@Param('id') id: string) {
    return this.envService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '更新环境' })
  update(@Param('id') id: string, @Body() updateDto: UpdateEnvironmentDto) {
    return this.envService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '删除环境' })
  remove(@Param('id') id: string) {
    return this.envService.remove(id);
  }
}
