import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { CreateProjectDto, QueryProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectService } from './project.service';

@ApiTags('项目管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '创建项目' })
  create(@Body() createDto: CreateProjectDto) {
    return this.projectService.create(createDto);
  }

  @Get()
  @ApiOperation({ description: '获取项目列表' })
  findAll(@Query() query: QueryProjectDto) {
    return this.projectService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ description: '获取项目详情' })
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '更新项目' })
  update(@Param('id') id: string, @Body() updateDto: UpdateProjectDto) {
    return this.projectService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '删除项目' })
  remove(@Param('id') id: string) {
    return this.projectService.remove(id);
  }
}
