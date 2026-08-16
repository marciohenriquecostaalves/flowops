import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { JobTitlesService } from './job-titles.service';

@ApiTags('job-titles') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard) @Roles('ADMIN', 'SUPERVISOR') @AccessAreas('jobTitles') @Controller('job-titles')
export class JobTitlesController {
  constructor(private readonly service: JobTitlesService) {}
  @Get() list(@Req() req: any) { return this.service.list(req.user.tenantId); }
  @Post() create(@Req() req: any, @Body() dto: CreateJobTitleDto) { return this.service.create(req.user.tenantId, req.user.sub, dto); }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateJobTitleDto) { return this.service.update(req.user.tenantId, req.user.sub, id, dto); }
}
