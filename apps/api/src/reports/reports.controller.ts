import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPERVISOR') @Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('productivity') productivity(@Req() req: any, @Query() query: Record<string, string>) { return this.service.productivity(req.user.tenantId, query); }
}
