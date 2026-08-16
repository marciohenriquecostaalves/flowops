import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { HistoryQueryDto } from './dto/history-query.dto';
import { HistoryService } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard)
@Roles('ADMIN', 'SUPERVISOR', 'OPERATOR', 'FOREMAN')
@AccessAreas('operations', 'reports')
@Controller('history')
export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  @Get('sessions')
  sessions(@Req() req: any, @Query() query: HistoryQueryDto) {
    return this.service.scopeForUser(req.user.tenantId, req.user.sub, req.user.roles ?? [], req.user.unitIds ?? [])
      .then((scope) => this.service.list(req.user.tenantId, query, scope));
  }

  @Get('sessions/export')
  export(@Req() req: any, @Query() query: HistoryQueryDto) {
    return this.service.scopeForUser(req.user.tenantId, req.user.sub, req.user.roles ?? [], req.user.unitIds ?? [])
      .then((scope) => this.service.export(req.user.tenantId, query, scope));
  }

  @Get('punches')
  punches(@Req() req: any, @Query() query: HistoryQueryDto) {
    return this.service.scopeForUser(req.user.tenantId, req.user.sub, req.user.roles ?? [], req.user.unitIds ?? [])
      .then((scope) => this.service.punches(req.user.tenantId, query, scope));
  }

  @Get('punches/export')
  punchesExport(@Req() req: any, @Query() query: HistoryQueryDto) {
    return this.service.scopeForUser(req.user.tenantId, req.user.sub, req.user.roles ?? [], req.user.unitIds ?? [])
      .then((scope) => this.service.punchesExport(req.user.tenantId, query, scope));
  }
}
