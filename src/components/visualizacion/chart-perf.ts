export function chartPerf() {
  const isMobile =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
  return {
    // Limitar el DPR reduce memoria y tiempo de render sin pérdida visible
    devicePixelRatio:
      typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1,
    xTicks: {
      autoSkip: true,
      maxRotation: 0,
      maxTicksLimit: isMobile ? 5 : 12,
      font: { size: 10 },
    },
    isMobile,
  };
}
