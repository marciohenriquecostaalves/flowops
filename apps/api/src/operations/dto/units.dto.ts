import { IsInt, Min } from 'class-validator';

export class UnitsDto {
  @IsInt()
  @Min(0)
  units!: number;
}
