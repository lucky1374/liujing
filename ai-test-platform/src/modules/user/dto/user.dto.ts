import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateUserDto {
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
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, description: '角色' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '真实姓名' })
  @IsOptional()
  @IsString()
  realName?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, description: '角色' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: '密码' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: '头像' })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserRole, description: '角色' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, description: '状态' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: '关键字搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '旧密码' })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
