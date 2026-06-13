'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminConsole from '@/components/AdminConsole';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/overview', { cache: 'no-store' })
      .then((res) => {
        if (res.ok) setAuthed(true);
        else router.push('/admin/login');
      })
      .catch(() => router.push('/admin/login'))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">Consola de Administración</h1>
          <button
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST', cache: 'no-store' });
              router.push('/admin/login');
            }}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AdminConsole />
      </main>
    </div>
  );
}
