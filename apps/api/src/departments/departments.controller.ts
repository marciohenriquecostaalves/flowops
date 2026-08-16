import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard)
@AccessAreas('departments')
@Roles('ADMIN', 'SUPERVISOR')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.tenantId, req.user.roles, req.user.unitIds);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateDepartmentDto) {
    return this.service.create(req.user.tenantId, req.user.sub, dto, req.user.roles, req.user.unitIds, req.user.primaryUnitId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.service.update(req.user.tenantId, req.user.sub, id, dto, req.user.roles, req.user.unitIds);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, req.user.sub, id, req.user.roles, req.user.unitIds);
  }
}
