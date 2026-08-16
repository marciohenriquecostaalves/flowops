import { SetMetadata } from '@nestjs/common';

export const ACCESS_AREAS_KEY = 'access-areas';
export const AccessAreas = (...areas: string[]) => SetMetadata(ACCESS_AREAS_KEY, areas);
