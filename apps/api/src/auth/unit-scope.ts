export function scopedUnitWhere(tenantId: string, roles: string[] = [], unitIds: string[] = []) {
  if (!roles.length || roles.includes('ADMIN')) return { tenantId };
  return { tenantId, unitId: { in: unitIds.length ? unitIds : ['__no_unit_access__'] } };
}

export function canAccessUnit(roles: string[] = [], unitIds: string[] = [], unitId: string) {
  return roles.includes('ADMIN') || unitIds.includes(unitId);
}
