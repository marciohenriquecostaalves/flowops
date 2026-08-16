import { IsString, MinLength } from 'class-validator';

export class PunchDto {
  @IsString()
  @MinLength(2)
  badgeCode!: string;
}
