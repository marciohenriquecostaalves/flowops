import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDepartmentDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  unitId?: string;
}
