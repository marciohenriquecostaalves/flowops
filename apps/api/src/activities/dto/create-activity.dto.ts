import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  code!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetPerHour?: number;

  @IsOptional()
  @IsString()
  unitId?: string;
}
