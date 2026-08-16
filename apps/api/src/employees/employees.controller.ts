import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AccessAreas } from '../auth/access-areas.decorator';
import { AccessAreasGuard } from '../auth/access-areas.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ProvisionAccessDto } from './dto/provision-access.dto';
import { UsersService } from '../users/users.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessAreasGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService, private readonly users: UsersService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  @AccessAreas('employees', 'operations')
  list(@Req() req: any) {
    return this.service.list(req.user.tenantId, req.user.roles?.includes('OPERATOR') ? req.user.sub : undefined);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @AccessAreas('employees')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async create(@Req() req: any, @Body() dto: CreateEmployeeDto, @UploadedFile() photo?: UploadedImage) {
    return this.service.create(req.user.tenantId, req.user.sub, dto, this.photoData(photo));
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @AccessAreas('employees')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEmployeeDto, @UploadedFile() photo?: UploadedImage) {
    return this.service.update(req.user.tenantId, req.user.sub, id, dto, this.photoData(photo));
  }

  @Post(':id/access')
  @Roles('ADMIN')
  @AccessAreas('employees')
  async provisionAccess(@Req() req: any, @Param('id') id: string, @Body() dto: ProvisionAccessDto) {
    const employee = await this.service.get(req.user.tenantId, id);
    return this.users.create(req.user.tenantId, req.user.sub, { name: employee.name, email: dto.email, password: dto.password, role: dto.role, employeeId: id });
  }

  @Delete(':id/access')
  @Roles('ADMIN')
  @AccessAreas('employees')
  revokeAccess(@Req() req: any, @Param('id') id: string) { return this.users.revokeEmployeeAccess(req.user.tenantId, req.user.sub, id); }

  private photoData(photo?: UploadedImage) {
    if (!photo) return undefined;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimetype)) {
      throw new BadRequestException('Envie uma imagem JPG, PNG ou WebP');
    }
    return `data:${photo.mimetype};base64,${photo.buffer.toString('base64')}`;
  }
}

type UploadedImage = { mimetype: string; buffer: Buffer };
