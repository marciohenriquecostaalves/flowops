import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}
  get(tenantId: string) { return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }); }
  getEmailDomain(tenantId: string) { return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { emailDomain: true, usesOwnEmailDomain: true } }); }
  async update(tenantId: string, actorUserId: string, dto: UpdateSettingsDto) {
    const before = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...dto,
        ...(dto.emailDomain ? { emailDomain: dto.emailDomain.trim().replace(/^@/, '').toLowerCase() } : {}),
        ...(dto.usesOwnEmailDomain === false ? { emailDomain: null } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        action: 'SETTINGS_UPDATED',
        entity: 'TENANT',
        entityId: tenantId,
        metadata: {
          before: { name: before.name, legalName: before.legalName, emailDomain: before.emailDomain, usesOwnEmailDomain: before.usesOwnEmailDomain, supportEmail: before.supportEmail, phone: before.phone, city: before.city, state: before.state },
          after: { name: updated.name, legalName: updated.legalName, emailDomain: updated.emailDomain, usesOwnEmailDomain: updated.usesOwnEmailDomain, supportEmail: updated.supportEmail, phone: updated.phone, city: updated.city, state: updated.state },
        },
      },
    });
    return updated;
  }
}
