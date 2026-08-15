import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsEmail() supportEmail?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
}
