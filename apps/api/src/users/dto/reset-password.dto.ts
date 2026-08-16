import { IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_PATTERN, PASSWORD_POLICY_MESSAGE } from '../../auth/password';

export class ResetPasswordDto {
  @IsString() @MinLength(8) @Matches(PASSWORD_PATTERN, { message: PASSWORD_POLICY_MESSAGE }) password!: string;
}
