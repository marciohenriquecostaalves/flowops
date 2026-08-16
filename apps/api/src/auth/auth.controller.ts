import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginRateLimitService } from './login-rate-limit.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly rateLimit: LoginRateLimitService) {}

  @Post('login')
  async login(@Req() req: any, @Body() dto: LoginDto) {
    const key = `${req.ip ?? 'unknown'}:${dto.email.trim().toLowerCase()}`;
    this.rateLimit.assertAllowed(key);
    try {
      const result = await this.auth.login(dto.email, dto.password);
      this.rateLimit.reset(key);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) this.rateLimit.registerFailure(key);
      throw error;
    }
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }
}
