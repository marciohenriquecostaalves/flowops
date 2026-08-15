import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
  list(@Req() req: any) {
    return this.service.list(req.user.tenantId);
  }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async create(@Req() req: any, @Body() dto: CreateEmployeeDto, @UploadedFile() photo?: UploadedImage) {
    return this.service.create(req.user.tenantId, req.user.sub, dto, this.photoData(photo));
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEmployeeDto, @UploadedFile() photo?: UploadedImage) {
    return this.service.update(req.user.tenantId, req.user.sub, id, dto, this.photoData(photo));
  }

  private photoData(photo?: UploadedImage) {
    if (!photo) return undefined;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimetype)) {
      throw new BadRequestException('Envie uma imagem JPG, PNG ou WebP');
    }
    return `data:${photo.mimetype};base64,${photo.buffer.toString('base64')}`;
  }
}

type UploadedImage = { mimetype: string; buffer: Buffer };
