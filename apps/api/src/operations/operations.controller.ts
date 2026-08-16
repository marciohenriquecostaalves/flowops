import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { OperationsService } from './operations.service';
import { StartSessionDto } from './dto/start-session.dto';
import { UnitsDto } from './dto/units.dto';
import { selectedUnitId as getSelectedUnitId } from '../auth/unit-scope';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly service: OperationsService) {}

  @Post('sessions/start')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @AccessAreas('operations')
  async start(@Req() req: any, @Body() dto: StartSessionDto) {
    if (req.user.roles?.includes('OPERATOR')) await this.service.assertOperatorStart(req.user.tenantId, req.user.sub, dto.employeeId);
    return this.service.start(req.user.tenantId, req.user.sub, dto, req.user.roles ?? [], req.user.unitIds ?? [], getSelectedUnitId(req));
  }

  @Post('sessions/:id/pause')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @AccessAreas('operations')
  async pause(@Req() req: any, @Param('id') id: string) {
    if (req.user.roles?.includes('OPERATOR')) await this.service.assertOperatorSession(req.user.tenantId, req.user.sub, id);
    return this.service.pause(req.user.tenantId, req.user.sub, id, req.user.roles ?? [], req.user.unitIds ?? [], getSelectedUnitId(req));
  }

  @Post('sessions/:id/resume')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @AccessAreas('operations')
  async resume(@Req() req: any, @Param('id') id: string) {
    if (req.user.roles?.includes('OPERATOR')) await this.service.assertOperatorSession(req.user.tenantId, req.user.sub, id);
    return this.service.resume(req.user.tenantId, req.user.sub, id, req.user.roles ?? [], req.user.unitIds ?? [], getSelectedUnitId(req));
  }

  @Post('sessions/:id/finish')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @AccessAreas('operations')
  async finish(@Req() req: any, @Param('id') id: string) {
    if (req.user.roles?.includes('OPERATOR')) await this.service.assertOperatorSession(req.user.tenantId, req.user.sub, id);
    return this.service.finish(req.user.tenantId, req.user.sub, id, req.user.roles ?? [], req.user.unitIds ?? [], getSelectedUnitId(req));
  }

  @Patch('sessions/:id/units')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @AccessAreas('operations')
  async setUnits(@Req() req: any, @Param('id') id: string, @Body() dto: UnitsDto) {
    if (req.user.roles?.includes('OPERATOR')) await this.service.assertOperatorSession(req.user.tenantId, req.user.sub, id);
    return this.service.setUnits(req.user.tenantId, req.user.sub, id, dto, req.user.roles ?? [], req.user.unitIds ?? [], getSelectedUnitId(req));
  }

  @Get('sessions/active')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR', 'FOREMAN')
  @AccessAreas('operations', 'dashboard')
  async active(@Req() req: any) {
    const departmentId = req.user.roles?.includes('FOREMAN') ? await this.service.departmentForUser(req.user.tenantId, req.user.sub) : undefined;
    return this.service.active(req.user.tenantId, req.user.roles?.includes('OPERATOR') ? req.user.sub : undefined, departmentId, req.user.roles ?? [], req.user.unitIds ?? [], getSelectedUnitId(req));
  }

  @Get('productivity')
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR', 'FOREMAN')
  @AccessAreas('operations', 'dashboard')
  async productivity(@Req() req: any) {
    const departmentId = req.user.roles?.includes('FOREMAN') ? await this.service.departmentForUser(req.user.tenantId, req.user.sub) : undefined;
    return this.service.productivity(req.user.tenantId, req.user.roles?.includes('OPERATOR') ? req.user.sub : undefined, departmentId, req.user.roles ?? [], req.user.unitIds ?? [], getSelectedUnitId(req));
  }
}
