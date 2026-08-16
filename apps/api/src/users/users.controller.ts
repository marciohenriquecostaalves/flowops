import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserUnitsDto } from './dto/update-user-units.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get() list(@Req() req: any) { return this.service.list(req.user.tenantId); }
  @Get('audit') audit(@Req() req: any, @Query('page') page?: string) { return this.service.auditLog(req.user.tenantId, Number(page) || 1); }
  @Post() create(@Req() req: any, @Body() dto: CreateUserDto) { return this.service.create(req.user.tenantId, req.user.sub, dto); }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) { return this.service.update(req.user.tenantId, req.user.sub, id, dto); }
  @Patch(':id/password') resetPassword(@Req() req: any, @Param('id') id: string, @Body() dto: ResetPasswordDto) { return this.service.resetPassword(req.user.tenantId, req.user.sub, id, dto.password); }
  @Patch(':id/units') updateUnits(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserUnitsDto) { return this.service.updateUnits(req.user.tenantId, req.user.sub, id, dto.unitIds); }
}
