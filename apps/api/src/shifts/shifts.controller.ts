import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateShiftDto } from './dto/create-shift.dto';
import { ShiftsService } from './shifts.service';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateShiftDto) {
    return this.service.create(req.user.tenantId, dto);
  }
}
