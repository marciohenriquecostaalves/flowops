import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';
import { USER_ROLES, UserRoleName } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(USER_ROLES) role?: UserRoleName;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}
