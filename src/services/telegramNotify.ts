const TELEGRAM_SEND_TIMEOUT_MS = 5000;

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
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
}

export async function notifyNewLead(lead: {
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  area: string;
  interests: string[];
}): Promise<void> {
  const token = process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) return;

  const name = lead.name || '(sin nombre)';
  const interests = lead.interests.length > 0 ? lead.interests.join(', ') : '(sin interés)';
  const area = lead.area || '(sin superficie)';

  const text = [
    '\u{1F331} NUEVO LEAD \u2014 Meteo Hu\u00e9scar',
    `\u{1F464} ${name}`,
    `\u{1F4F1} ${lead.phone}`,
    `\u{1F4CD} ${lead.municipality}`,
    `\u{1F33E} ${lead.crop} \u00B7 ${area}`,
    `\u{1F3AF} ${interests}`,
  ].join('\n');

  await sendTelegramMessage(text);
}