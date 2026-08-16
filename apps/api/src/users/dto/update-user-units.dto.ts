import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class UpdateUserUnitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  unitIds!: string[];
}
