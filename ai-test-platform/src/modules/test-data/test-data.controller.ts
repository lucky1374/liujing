import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestDataService } from './test-data.service';
import { CreateTestDataDto, UpdateTestDataDto, QueryTestDataDto } from './dto/test-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('测试数据')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-data')
export class TestDataController {
  constructor(private readonly dataService: TestDataService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '创建测试数据' })
  create(@Body() createDto: CreateTestDataDto, @Request() req: any) {
    return this.dataService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ description: '获取测试数据列表' })
  findAll(@Query() query: QueryTestDataDto) {
    return this.dataService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ description: '获取测试数据详情' })
  findOne(@Param('id') id: string) {
    return this.dataService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '更新测试数据' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTestDataDto, @Request() req: any) {
    return this.dataService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TESTER)
  @ApiOperation({ description: '删除测试数据' })
  remove(@Param('id') id: string) {
    return this.dataService.remove(id);
  }
}
