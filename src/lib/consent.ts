const ANALYTICS_CONSENT_KEY = 'meteo_analytics_consent';

export type ConsentStatus = 'granted' | 'denied' | 'unset';

/** Evento interno que avisa a los consumidores (p. ej. RUM) de un cambio de consentimiento. */
export const ANALYTICS_CONSENT_EVENT = 'meteo:analytics-consent';

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'unset';
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (value === 'granted') return 'granted';
    if (value === 'denied') return 'denied';
  } catch {}
  return 'unset';
}

export function setConsentStatus(status: ConsentStatus): void {
  if (typeof window === 'undefined') return;
  try {
    if (status === 'unset') localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    else localStorage.setItem(ANALYTICS_CONSENT_KEY, status);
  } catch {}
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: { status } }));
}

export function hasAnalyticsConsent(): boolean {
  return getConsentStatus() === 'granted';
}
