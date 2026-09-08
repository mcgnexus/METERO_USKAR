import { z } from 'zod';

/**
 * Esquema compartido (cliente + servidor) para el formulario de leads.
 * El servidor NUNCA confía en la validación del navegador: aplica este
 * mismo esquema con `safeParse` antes de guardar.
 */

export const LEAD_CROPS = ['Olivar', 'Almendro', 'Pistacho', 'Hortícola', 'Otro'] as const;
export const LEAD_AREAS = ['Menos de 5 ha', '5-20 ha', '20-50 ha', 'Más de 50 ha', 'Prefiero no decirlo'] as const;
export const LEAD_INTERESTS = [
  'Avisos de helada',
  'Recomendaciones de riego',
  'Sensores para mi finca',
  'Diagnóstico agrícola',
  'Riego',
  'Heladas',
  'Sensores',
  'Diagnóstico de plantas',
  'Automatización',
  'Información sobre Terracía',
] as const;

/** Teléfono: dígitos con separadores habituales; 7-30 caracteres. */
export const PHONE_REGEX = /^[+0-9 ()-]{7,30}$/;

/** Versión de la política de privacidad/consentimientos vigente (evidencia en BD). */
export const CONSENT_POLICY_VERSION = '2026-09-v1';

/** Canales informados al usuario para cada finalidad (se conservan como evidencia). */
export const CONSENT_SERVICE_CHANNELS = ['whatsapp', 'notificaciones'] as const;
export const CONSENT_COMMERCIAL_CHANNELS = ['whatsapp', 'email', 'notificaciones'] as const;

/** Elimina separadores del teléfono para comparación/guardado homogéneo. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s().-]/g, '');
}

/** Elimina caracteres de control y ángulos de cualquier texto libre. */
function sanitizeText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f<>]/g, '');
}

const freeText = (max: number) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().trim().max(max));

export const leadFormSchema = z.object({
  /** Nombre opcional del solicitante. */
  name: freeText(80).optional().default(''),
  phone: z
    .string()
    .trim()
    .max(30, 'El teléfono es demasiado largo.')
    .regex(PHONE_REGEX, 'Introduce un teléfono o WhatsApp válido.')
    .refine((value) => value.replace(/\D/g, '').length >= 7, 'Introduce un teléfono o WhatsApp válido.')
    .transform(normalizePhone),
  municipality: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .trim()
        .min(2, 'Introduce el municipio.')
        .max(80, 'El municipio es demasiado largo.'),
    ),
  crop: z.enum(LEAD_CROPS, { message: 'Selecciona un cultivo.' }),
  interests: z
    .array(z.enum(LEAD_INTERESTS))
    .max(10)
    .transform((values) => [...new Set(values)])
    .refine((values) => values.length <= 5, 'Selecciona como máximo 5 intereses.')
    .default([]),
  /** Consentimiento del servicio (avisos de la finca): obligatorio e independiente del comercial. */
  serviceConsent: z.literal(true, { message: 'Debes aceptar los avisos para tu finca para enviar la solicitud.' }),
  /** Consentimiento comercial opcional. */
  marketingConsent: z.boolean().optional().default(false),
  /** Origen del lead (p. ej. "meteo-huescar"). */
  source: freeText(40).optional(),
  /** Campaña de marketing (se guarda como utm_campaign). */
  campaign: freeText(100).optional(),
  /** Superficie aproximada (opcional). */
  area: z.enum(LEAD_AREAS).optional().or(z.literal('')),
  /** Página desde la que se envía. */
  landingPage: freeText(200).optional(),
  utmSource: freeText(100).optional(),
  utmMedium: freeText(100).optional(),
  /** Honeypot anti-spam: debe llegar vacío. */
  website: z.string().max(20).optional().default(''),
});

export type LeadFormInput = z.infer<typeof leadFormSchema>;

/** Convierte un ZodError en mapa campo → primer mensaje (para pintar bajo cada input). */
export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
