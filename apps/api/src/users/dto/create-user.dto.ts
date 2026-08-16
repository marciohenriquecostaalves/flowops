import { IsArray, IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_PATTERN, PASSWORD_POLICY_MESSAGE } from '../../auth/password';

export const USER_ROLES = ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'FOREMAN'] as const;
export type UserRoleName = (typeof USER_ROLES)[number];

export const ACCESS_AREAS = ['dashboard', 'operations', 'employees', 'jobTitles', 'departments', 'shifts', 'activities', 'reports', 'businessUnits'] as const;
export type AccessArea = (typeof ACCESS_AREAS)[number];

export function defaultAccessAreas(role: string): AccessArea[] {
  if (role === 'FOREMAN') return ['dashboard', 'reports'];
  if (role === 'OPERATOR') return ['dashboard', 'operations'];
  return [...ACCESS_AREAS];
}

export class CreateUserDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @Matches(PASSWORD_PATTERN, { message: PASSWORD_POLICY_MESSAGE }) password!: string;
  @IsIn(USER_ROLES) role!: UserRoleName;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsArray() @IsIn(ACCESS_AREAS, { each: true }) accessAreas?: AccessArea[];
}
