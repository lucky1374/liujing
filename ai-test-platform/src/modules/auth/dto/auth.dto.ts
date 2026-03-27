import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: '真实姓名' })
  @IsString()
  realName: string;

  @ApiProperty({ description: '邮箱' })
  @IsString()
  email: string;
}
