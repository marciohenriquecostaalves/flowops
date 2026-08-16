export function selectedUnitId(req: any): string | undefined {
  const value = req?.headers?.['x-flowops-unit-id'];
  return Array.isArray(value) ? value[0] : value || undefined;
}

export function effectiveUnitIds(roles: string[] = [], unitIds: string[] = [], selected?: string) {
  if (selected !== undefined) {
    if (roles.includes('ADMIN') || unitIds.includes(selected)) return [selected];
    return ['__no_unit_access__'];
  }
  if (!roles.length || roles.includes('ADMIN')) return undefined;
  return unitIds.length ? unitIds : ['__no_unit_access__'];
}

export function scopedUnitWhere(tenantId: string, roles: string[] = [], unitIds: string[] = [], selected?: string) {
  const effective = effectiveUnitIds(roles, unitIds, selected);
  return { tenantId, ...(effective ? { unitId: { in: effective } } : {}) };
}

export function canAccessUnit(roles: string[] = [], unitIds: string[] = [], unitId: string) {
  return roles.includes('ADMIN') || unitIds.includes(unitId);
}
