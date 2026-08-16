import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateKioskDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  activityId!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  code?: string;
}
