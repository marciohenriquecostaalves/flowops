import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  corporateEmail?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(2)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  jobTitleId?: string | null;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  shiftId?: string | null;

  @IsOptional()
  @IsString()
  unitId?: string;
}
