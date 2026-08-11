import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsInt()
  @Min(0)
  @Max(180)
  toleranceMinutes = 0;
}
