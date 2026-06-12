'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Credenciales inválidas');
      }

      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-800 rounded-2xl p-8 shadow-2xl"
      >
        <h1 className="text-xl font-bold text-white mb-6 text-center">Acceso Administrativo</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={1}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Introduce la contraseña"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
