import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() @Matches(/^@?[^\s@]+\.[^\s@]+$/, { message: 'Informe um domínio válido, como @empresa.com.br' }) emailDomain?: string | null;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() usesOwnEmailDomain?: boolean;
  @IsOptional() @IsEmail() supportEmail?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
}
