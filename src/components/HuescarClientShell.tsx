'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

const LlanoPulseDashboard = dynamic(() => import('@/components/LlanoPulseDashboard'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#f4f7fb]" />,
});

export function HuescarClientShell(props: ComponentProps<typeof LlanoPulseDashboard>) {
  return <LlanoPulseDashboard {...props} />;
}
