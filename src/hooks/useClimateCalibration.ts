'use client';

import { useApiData } from '@/hooks/useApiData';
import type { ClimateCalibrationPayload } from '@/types/climate';

export { type ClimateCalibrationPayload, type ClimateNode } from '@/types/climate';

export function useClimateCalibration(
  cacheKey = 'climate-calibration',
  initialData?: ClimateCalibrationPayload | null
) {
  return useApiData<ClimateCalibrationPayload>(
    '/api/weather/climate-calibration',
    cacheKey,
    initialData
  );
}
