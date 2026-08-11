import { IsString } from 'class-validator';

export class StartSessionDto {
  @IsString()
  employeeId!: string;

  @IsString()
  activityId!: string;
}
