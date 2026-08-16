import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard) @Roles('ADMIN', 'SUPERVISOR', 'FOREMAN') @AccessAreas('reports') @Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('productivity')
  async productivity(@Req() req: any, @Query() query: Record<string, string>) {
    if (req.user.roles?.includes('FOREMAN')) {
      const departmentId = await this.service.departmentForUser(req.user.tenantId, req.user.sub);
      return this.service.productivity(req.user.tenantId, { ...query, departmentId }, req.user.roles ?? [], req.user.unitIds ?? []);
    }
    return this.service.productivity(req.user.tenantId, query, req.user.roles ?? [], req.user.unitIds ?? []);
  }
}
