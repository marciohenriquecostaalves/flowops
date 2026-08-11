import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperationsService } from './operations.service';
import { StartSessionDto } from './dto/start-session.dto';
import { UnitsDto } from './dto/units.dto';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly service: OperationsService) {}

  @Post('sessions/start')
  start(@Req() req: any, @Body() dto: StartSessionDto) {
    return this.service.start(req.user.tenantId, dto);
  }

  @Post('sessions/:id/pause')
  pause(@Req() req: any, @Param('id') id: string) {
    return this.service.pause(req.user.tenantId, id);
  }

  @Post('sessions/:id/resume')
  resume(@Req() req: any, @Param('id') id: string) {
    return this.service.resume(req.user.tenantId, id);
  }

  @Post('sessions/:id/finish')
  finish(@Req() req: any, @Param('id') id: string) {
    return this.service.finish(req.user.tenantId, id);
  }

  @Patch('sessions/:id/units')
  setUnits(@Req() req: any, @Param('id') id: string, @Body() dto: UnitsDto) {
    return this.service.setUnits(req.user.tenantId, id, dto);
  }

  @Get('sessions/active')
  active(@Req() req: any) {
    return this.service.active(req.user.tenantId);
  }

  @Get('productivity')
  productivity(@Req() req: any) {
    return this.service.productivity(req.user.tenantId);
  }
}
