import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateBusinessUnitDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{2,24}$/, { message: 'Use um código com 2 a 24 caracteres alfanuméricos' })
  code!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsIn(['HEADQUARTERS', 'BRANCH'])
  type?: 'HEADQUARTERS' | 'BRANCH';
}
