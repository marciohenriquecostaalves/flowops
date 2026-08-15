import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JobTitlesController } from './job-titles.controller';
import { JobTitlesService } from './job-titles.service';
@Module({ imports: [PrismaModule, AuthModule], controllers: [JobTitlesController], providers: [JobTitlesService] })
export class JobTitlesModule {}
