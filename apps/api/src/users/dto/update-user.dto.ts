import { IsArray, IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';
import { ACCESS_AREAS, AccessArea, USER_ROLES, UserRoleName } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(USER_ROLES) role?: UserRoleName;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsArray() @IsIn(ACCESS_AREAS, { each: true }) accessAreas?: AccessArea[];
}
