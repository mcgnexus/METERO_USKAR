export type AlertChannel = 'notificaciones' | 'whatsapp';

export type AlertLifecycleState =
  | 'activo'
  | 'pendiente_permiso'
  | 'pausado'
  | 'error'
  | 'dado_de_baja'
  | 'no_soportado';

export type AlertLifecycleInput = {
  browserSupport: boolean;
  permission: 'granted' | 'denied' | 'default';
  subscribed: boolean;
  paused: boolean;
  unsubscribed: boolean;
  lastError: string | null;
};

export type AlertLifecycle = {
  state: AlertLifecycleState;
  label: string;
  description: string;
  actionable: string | null;
  canSend: boolean;
};

/**
 * Estado real del ciclo de vida de las alertas. 'dado_de_baja' y 'pausado'
 * tienen prioridad: impiden envíos aunque la suscripción del navegador siga
 * activa (una baja debe impedir futuros envíos sin asistencia manual).
 */
export function resolveAlertLifecycle(input: AlertLifecycleInput): AlertLifecycle {
  if (input.unsubscribed) {
    return {
      state: 'dado_de_baja',
      label: 'Dado de baja',
      description: 'Has cancelado las alertas. No se enviará nada más a este dispositivo.',
      actionable: 'Puedes volver a activarlas cuando quieras desde el asistente de alertas.',
      canSend: false,
    };
  }
  if (input.paused) {
    return {
      state: 'pausado',
      label: 'Pausado',
      description: 'Las alertas están en pausa: no se envían avisos hasta que las reactives.',
      actionable: 'Reactiva las alertas para volver a recibir avisos.',
      canSend: false,
    };
  }
  if (!input.browserSupport) {
    return {
      state: 'no_soportado',
      label: 'No disponible',
      description: 'Este navegador no soporta notificaciones push.',
      actionable: 'Puedes recibir la atención personalizada por WhatsApp como alternativa.',
      canSend: false,
    };
  }
  if (input.permission === 'denied') {
    return {
      state: 'error',
      label: 'Permiso bloqueado',
      description: 'El navegador tiene las notificaciones bloqueadas para este sitio.',
      actionable: 'Desbloquea las notificaciones en los ajustes del navegador y reintenta aquí.',
      canSend: false,
    };
  }
  if (input.lastError && !input.subscribed) {
    return {
      state: 'error',
      label: 'Error',
      description: `No se pudo completar la activación: ${input.lastError}.`,
      actionable: 'Reintenta la activación; si persiste, prueba más tarde o usa WhatsApp.',
      canSend: false,
    };
  }
  if (input.permission !== 'granted' || !input.subscribed) {
    return {
      state: 'pendiente_permiso',
      label: 'Pendiente de permiso',
      description: 'Falta conceder permiso o completar la suscripción del navegador.',
      actionable: 'Termina el asistente de activación para empezar a recibir avisos.',
      canSend: false,
    };
  }
  return {
    state: 'activo',
    label: 'Activo',
    description: 'Recibirás avisos automáticos cuando se cumplan tus umbrales.',
    actionable: null,
    canSend: true,
  };
}

export type DedupDecision = {
  send: boolean;
  reason: 'primera_vez' | 'condicion_nueva' | 'duplicado' | 'sin_envio';
};

/**
 * Idempotencia/deduplicación: una condición meteorológica (misma clave y
 * mismo día) no produce avisos repetidos dentro de la ventana de cooldown.
 */
export function shouldSendAlert(params: {
  conditionKey: string | null;
  lastSentKey: string | null;
  lastSentAt: number | null;
  nowMs: number;
  cooldownMinutes?: number;
}): DedupDecision {
  if (params.conditionKey === null) return { send: false, reason: 'sin_envio' };
  if (params.lastSentKey === null || params.lastSentAt === null) {
    return { send: true, reason: 'primera_vez' };
  }
  if (params.conditionKey !== params.lastSentKey) {
    return { send: true, reason: 'condicion_nueva' };
  }
  const cooldown = (params.cooldownMinutes ?? 60) * 60000;
  if (params.nowMs - params.lastSentAt < cooldown) {
    return { send: false, reason: 'duplicado' };
  }
  return { send: true, reason: 'primera_vez' };
}

/** Clave estable de condición: tipo + día local + nivel. */
export function alertConditionKey(params: {
  type: string;
  day: string;
  level: string;
}): string {
  return `${params.type}:${params.day}:${params.level}`;
}

/** ¿La hora local está dentro de la franja de silencio (p. ej. 22:00–07:00)? */
export function isWithinQuietHours(hour: number, quietStart: number, quietEnd: number): boolean {
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) return hour >= quietStart && hour < quietEnd;
  return hour >= quietStart || hour < quietEnd;
}

export type DeliveryLogInput = {
  channel: AlertChannel;
  conditionKey: string;
  ok: boolean;
  errorType?: 'network' | 'token_invalido' | 'proveedor' | 'desconocido';
};

/**
 * Registro de envío/fallo SIN datos privados: nada de endpoints, tokens,
 * teléfonos ni correos. Solo canal, condición, resultado y tipo de error.
 */
export function sanitizeDeliveryLog(input: DeliveryLogInput): Record<string, unknown> {
  return {
    channel: input.channel,
    conditionKey: input.conditionKey,
    ok: input.ok,
    errorType: input.ok ? null : input.errorType ?? 'desconocido',
    at: new Date().toISOString(),
  };
}

export const WHATSAPP_CHANNEL_NOTE =
  'WhatsApp es un canal de atención personalizada (TecRural), gestionado por una persona. No es el sistema automático de notificaciones y no comparte configuración con él.';
