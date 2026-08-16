import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const SESSION_STATUSES = ['RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const;
export type HistoryStatus = (typeof SESSION_STATUSES)[number];

export class HistoryQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() shiftId?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() activityId?: string;
  @IsOptional() @IsIn(SESSION_STATUSES) status?: HistoryStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 10;
}
