import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';
import { selectedUnitId as getSelectedUnitId } from '../auth/unit-scope';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard)
@AccessAreas('shifts')
@Roles('ADMIN', 'SUPERVISOR')
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.tenantId, req.user.roles, req.user.unitIds, getSelectedUnitId(req));
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateShiftDto) {
    return this.service.create(req.user.tenantId, req.user.sub, dto, req.user.roles, req.user.unitIds, req.user.primaryUnitId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.service.update(req.user.tenantId, req.user.sub, id, dto, req.user.roles, req.user.unitIds, getSelectedUnitId(req));
  }
}
