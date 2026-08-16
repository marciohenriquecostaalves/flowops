import { IsBoolean, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateBusinessUnitDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{2,24}$/, { message: 'Use um código com 2 a 24 caracteres alfanuméricos' })
  code?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsIn(['HEADQUARTERS', 'BRANCH'])
  type?: 'HEADQUARTERS' | 'BRANCH';

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
