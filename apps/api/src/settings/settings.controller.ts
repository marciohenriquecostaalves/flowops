import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('settings') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get() get(@Req() req: any) { return this.service.get(req.user.tenantId); }
  @Patch() update(@Req() req: any, @Body() dto: UpdateSettingsDto) { return this.service.update(req.user.tenantId, dto); }
}
