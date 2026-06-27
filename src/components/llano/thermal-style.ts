export function thermalBg(t: number): string {
  if (t <= 0) return 'from-blue-700 via-blue-600 to-cyan-500';
  if (t <= 8) return 'from-cyan-700 via-cyan-600 to-teal-500';
  if (t <= 16) return 'from-emerald-600 via-emerald-500 to-teal-400';
  if (t <= 24) return 'from-lime-500 via-emerald-400 to-emerald-500';
  if (t <= 30) return 'from-amber-500 via-orange-400 to-orange-500';
  if (t <= 35) return 'from-orange-600 via-red-500 to-red-600';
  return 'from-red-700 via-rose-600 to-rose-700';
}

export function thermalSurface(t: number): string {
  if (t <= 0) return 'bg-blue-50 text-blue-800 border-blue-200';
  if (t <= 8) return 'bg-cyan-50 text-cyan-800 border-cyan-200';
  if (t <= 16) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (t <= 24) return 'bg-lime-50 text-lime-800 border-lime-200';
  if (t <= 30) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (t <= 35) return 'bg-orange-50 text-orange-800 border-orange-200';
  return 'bg-rose-50 text-rose-800 border-rose-200';
}
