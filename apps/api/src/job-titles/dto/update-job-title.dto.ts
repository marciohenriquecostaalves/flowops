import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateJobTitleDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() unitId?: string;
}
