const TELEGRAM_SEND_TIMEOUT_MS = 5000;

/**
 * Variables de entorno del servidor (NUNCA llegan al frontend):
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (nombres del spec)
 *   TELEGRAM_NOTIFY_BOT_TOKEN / TELEGRAM_NOTIFY_CHAT_ID (nombres históricos)
 */
function telegramCredentials(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

export function sendTelegramMessage(text: string): Promise<boolean> {
  const creds = telegramCredentials();
  if (!creds) {
    console.warn('[telegramNotify] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no configurados');
    return Promise.resolve(false);
  }

  return (async () => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${creds.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: creds.chatId, text }),
        signal: AbortSignal.timeout(TELEGRAM_SEND_TIMEOUT_MS),
      });
      if (!res.ok) {
        console.warn(`[telegramNotify] Telegram respondió ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[telegramNotify] No se pudo enviar el mensaje:', err instanceof Error ? err.message : 'error desconocido');
      return false;
    }
  })();
}

/**
 * Notifica un lead nuevo por Telegram. Devuelve true solo si Telegram
 * confirmó el envío. El resultado NO afecta al guardado del lead: el lead
 * ya está en base de datos cuando se llama a esta función.
 */
export async function notifyNewLead(lead: {
  leadId?: number;
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  area: string;
  interests: string[];
}): Promise<boolean> {
  if (!telegramCredentials()) return false;

  const name = lead.name || '(sin nombre)';
  const interests = lead.interests.length > 0 ? lead.interests.join(', ') : '(sin interés)';
  const area = lead.area || '(sin superficie)';
  const leadRef = lead.leadId != null ? `#${lead.leadId}` : '';

  const text = [
    `\u{1F331} NUEVO LEAD ${leadRef} \u2014 Meteo Hu\u00e9scar`,
    `\u{1F464} ${name}`,
    `\u{1F4F1} ${lead.phone}`,
    `\u{1F4CD} ${lead.municipality}`,
    `\u{1F33E} ${lead.crop} \u00B7 ${area}`,
    `\u{1F3AF} ${interests}`,
  ].join('\n');

  return sendTelegramMessage(text);
}
