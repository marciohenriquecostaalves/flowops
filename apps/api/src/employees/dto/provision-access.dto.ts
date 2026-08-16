import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
export class ProvisionAccessDto { @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; @IsIn(['SUPERVISOR', 'OPERATOR', 'FOREMAN']) role!: 'SUPERVISOR' | 'OPERATOR' | 'FOREMAN'; }
