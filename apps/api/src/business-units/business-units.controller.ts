import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { BusinessUnitsService } from './business-units.service';

@ApiTags('business-units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard)
@AccessAreas('businessUnits')
@Controller('business-units')
export class BusinessUnitsController {
  constructor(private readonly service: BusinessUnitsService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'FOREMAN')
  list(@Req() req: any) {
    return this.service.list(req.user.tenantId);
  }

  @Post()
  @Roles('ADMIN')
  create(@Req() req: any, @Body() dto: CreateBusinessUnitDto) {
    return this.service.create(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateBusinessUnitDto) {
    return this.service.update(req.user.tenantId, req.user.sub, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, req.user.sub, id);
  }
}
