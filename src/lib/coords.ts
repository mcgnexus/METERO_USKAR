export function parseCoord(value: string | null, defaultValue: number): number {
  if (value === null || value.trim() === "") return defaultValue;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}
