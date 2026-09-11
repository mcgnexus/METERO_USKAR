import { describe, it, expect } from 'vitest';
import {
  resolveAlertLifecycle,
  shouldSendAlert,
  alertConditionKey,
  isWithinQuietHours,
  sanitizeDeliveryLog,
  WHATSAPP_CHANNEL_NOTE,
} from '@/lib/alertLifecycle';

const grantedSubscribed = {
  browserSupport: true,
  permission: 'granted' as const,
  subscribed: true,
  paused: false,
  unsubscribed: false,
  lastError: null,
};

describe('ciclo de vida de alertas', () => {
  it('activo con permiso concedido y suscripción', () => {
    const lc = resolveAlertLifecycle(grantedSubscribed);
    expect(lc.state).toBe('activo');
    expect(lc.canSend).toBe(true);
  });

  it('pendiente de permiso sin conceder o sin suscripción', () => {
    expect(resolveAlertLifecycle({ ...grantedSubscribed, permission: 'default' }).state).toBe('pendiente_permiso');
    expect(resolveAlertLifecycle({ ...grantedSubscribed, subscribed: false }).state).toBe('pendiente_permiso');
  });

  it('pausado bloquea envíos aunque la suscripción siga activa', () => {
    const lc = resolveAlertLifecycle({ ...grantedSubscribed, paused: true });
    expect(lc.state).toBe('pausado');
    expect(lc.canSend).toBe(false);
  });

  it('la baja impide futuros envíos sin asistencia manual', () => {
    const lc = resolveAlertLifecycle({ ...grantedSubscribed, unsubscribed: true });
    expect(lc.state).toBe('dado_de_baja');
    expect(lc.canSend).toBe(false);
  });

  it('permiso bloqueado → error con mensaje accionable', () => {
    const lc = resolveAlertLifecycle({ ...grantedSubscribed, permission: 'denied' });
    expect(lc.state).toBe('error');
    expect(lc.actionable).toContain('ajustes del navegador');
  });

  it('navegador sin soporte → estado propio y alternativa', () => {
    const lc = resolveAlertLifecycle({ ...grantedSubscribed, browserSupport: false });
    expect(lc.state).toBe('no_soportado');
    expect(lc.actionable).toContain('WhatsApp');
  });
});

describe('idempotencia y deduplicación', () => {
  const key = alertConditionKey({ type: 'helada', day: '2026-09-11', level: 'critico' });

  it('primera vez → envía', () => {
    expect(shouldSendAlert({ conditionKey: key, lastSentKey: null, lastSentAt: null, nowMs: 1000 }).send).toBe(true);
  });

  it('condición distinta → envía aunque hubiera aviso reciente', () => {
    const other = alertConditionKey({ type: 'viento', day: '2026-09-11', level: 'critico' });
    const d = shouldSendAlert({ conditionKey: other, lastSentKey: key, lastSentAt: 1000, nowMs: 2000 });
    expect(d.send).toBe(true);
    expect(d.reason).toBe('condicion_nueva');
  });

  it('misma condición dentro del cooldown → duplicado, no envía', () => {
    const d = shouldSendAlert({ conditionKey: key, lastSentKey: key, lastSentAt: 1000, nowMs: 60 * 60000 - 1 });
    expect(d.send).toBe(false);
    expect(d.reason).toBe('duplicado');
  });

  it('misma condición pasada la ventana → vuelve a enviar', () => {
    const d = shouldSendAlert({ conditionKey: key, lastSentKey: key, lastSentAt: 1000, nowMs: 61 * 60000 });
    expect(d.send).toBe(true);
  });

  it('sin condición no hay envío', () => {
    expect(shouldSendAlert({ conditionKey: null, lastSentKey: null, lastSentAt: null, nowMs: 0 }).send).toBe(false);
  });
});

describe('franja de silencio', () => {
  it('franjas nocturnas que cruzan medianoche', () => {
    expect(isWithinQuietHours(23, 22, 7)).toBe(true);
    expect(isWithinQuietHours(3, 22, 7)).toBe(true);
    expect(isWithinQuietHours(9, 22, 7)).toBe(false);
  });

  it('franjas diurnas y rango vacío', () => {
    expect(isWithinQuietHours(14, 13, 15)).toBe(true);
    expect(isWithinQuietHours(16, 13, 15)).toBe(false);
    expect(isWithinQuietHours(5, 7, 7)).toBe(false);
  });
});

describe('registro de entrega sin datos privados', () => {
  it('el registro no contiene endpoint, teléfono, email ni token', () => {
    const log = sanitizeDeliveryLog({
      channel: 'notificaciones',
      conditionKey: 'helada:2026-09-11:critico',
      ok: false,
      errorType: 'token_invalido',
    });
    const serialized = JSON.stringify(log);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/@/);
    expect(serialized).not.toMatch(/endpoint|phone|email/i);
    expect(log).toEqual({
      channel: 'notificaciones',
      conditionKey: 'helada:2026-09-11:critico',
      ok: false,
      errorType: 'token_invalido',
      at: expect.any(String),
    });
  });

  it('separación de canales documentada: WhatsApp no es el sistema automático', () => {
    expect(WHATSAPP_CHANNEL_NOTE).toContain('atención personalizada');
    expect(WHATSAPP_CHANNEL_NOTE).toContain('No es el sistema automático');
  });
});
