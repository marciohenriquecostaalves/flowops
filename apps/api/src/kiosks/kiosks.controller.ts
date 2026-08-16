import { Body, Controller, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateKioskDto } from './dto/create-kiosk.dto';
import { PunchDto } from './dto/punch.dto';
import { UpdateKioskDto } from './dto/update-kiosk.dto';
import { KiosksService } from './kiosks.service';

@ApiTags('kiosk')
@Controller('kiosk')
export class KioskController {
  constructor(private readonly service: KiosksService) {}

  @Post('punch')
  punch(@Headers('x-kiosk-code') kioskCode: string | undefined, @Headers('x-kiosk-token') kioskToken: string | undefined, @Body() dto: PunchDto) {
    return this.service.punch(kioskCode, kioskToken, dto.badgeCode);
  }
}

@ApiTags('kiosk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard)
@Controller('kiosk/devices')
export class KioskDevicesController {
  constructor(private readonly service: KiosksService) {}

  @Get()
  @Roles('ADMIN')
  @AccessAreas('settings')
  list(@Req() req: any) {
    return this.service.list(req.user.tenantId);
  }

  @Post()
  @Roles('ADMIN')
  @AccessAreas('settings')
  create(@Req() req: any, @Body() dto: CreateKioskDto) {
    return this.service.create(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @AccessAreas('settings')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateKioskDto) {
    return this.service.update(req.user.tenantId, req.user.sub, id, dto);
  }

  @Post(':id/token')
  @Roles('ADMIN')
  @AccessAreas('settings')
  rotateToken(@Req() req: any, @Param('id') id: string) {
    return this.service.rotateToken(req.user.tenantId, req.user.sub, id);
  }
}
