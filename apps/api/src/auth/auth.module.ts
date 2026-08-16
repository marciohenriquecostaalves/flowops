import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { AccessAreasGuard } from './access-areas.guard';
import { LoginRateLimitService } from './login-rate-limit.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, AccessAreasGuard, LoginRateLimitService],
  exports: [AuthService, RolesGuard, AccessAreasGuard],
})
export class AuthModule {}
