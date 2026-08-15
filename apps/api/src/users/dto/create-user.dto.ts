import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export const USER_ROLES = ['ADMIN', 'SUPERVISOR', 'OPERATOR'] as const;
export type UserRoleName = (typeof USER_ROLES)[number];

export class CreateUserDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsIn(USER_ROLES) role!: UserRoleName;
}
