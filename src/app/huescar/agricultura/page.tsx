import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/huescar/agricultura' },
};

export default function AgriculturaRedirect() {
  redirect('/huescar/campo');
}
