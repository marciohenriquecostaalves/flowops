import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  list(@Req() req: { user: { tenantId: string } }) {
    return this.service.list(req.user.tenantId);
  }

  @Post()
  create(
    @Req() req: { user: { tenantId: string } },
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.service.create(req.user.tenantId, dto);
  }
}
