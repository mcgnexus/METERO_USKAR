'use client';

import { RouteError } from '@/components/common/RouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="Fuentes y fiabilidad" />;
}
