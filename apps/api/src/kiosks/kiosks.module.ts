import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KioskController, KioskDevicesController } from './kiosks.controller';
import { KiosksService } from './kiosks.service';

@Module({
  imports: [AuthModule],
  controllers: [KioskController, KioskDevicesController],
  providers: [KiosksService],
})
export class KiosksModule {}
