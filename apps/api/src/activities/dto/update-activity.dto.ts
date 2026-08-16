import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetPerHour?: number;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  unitId?: string;
}
