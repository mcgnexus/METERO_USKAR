'use client';

import { useApiData } from '@/hooks/useApiData';
import type { AgroClimatologyPayload } from '@/services/agroClimatologyService';

export function useAgroClimatology() {
  return useApiData<AgroClimatologyPayload>('/api/weather/agro-climatology', 'agro-climatology');
}
