import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  list(@Req() req: any) {
    return this.service.list(req.user.tenantId);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  create(@Req() req: any, @Body() dto: CreateActivityDto) {
    return this.service.create(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.service.update(req.user.tenantId, req.user.sub, id, dto);
  }
}
