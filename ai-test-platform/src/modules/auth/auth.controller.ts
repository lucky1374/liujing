import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserService } from '../user/user.service';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  @ApiOperation({ description: '注册用户' })
  register(@Body() registerDto: RegisterDto) {
    return this.userService.create(registerDto as any);
  }

  @Post('login')
  @ApiOperation({ description: '登录' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ description: '获取当前用户信息' })
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.userId);
  }
}
