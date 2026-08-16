import { IsEmail, IsIn, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_PATTERN, PASSWORD_POLICY_MESSAGE } from '../../auth/password';
export class ProvisionAccessDto { @IsEmail() email!: string; @IsString() @MinLength(8) @Matches(PASSWORD_PATTERN, { message: PASSWORD_POLICY_MESSAGE }) password!: string; @IsIn(['SUPERVISOR', 'OPERATOR', 'FOREMAN']) role!: 'SUPERVISOR' | 'OPERATOR' | 'FOREMAN'; }
