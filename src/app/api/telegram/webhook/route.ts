import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/services/telegramNotify';
import { getRecentLeads } from '@/lib/weatherStore';

const MAX_LEADS = 15;
const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatRecentLead(lead: import('@/lib/weatherStore').RecentLead, index: number, offset: number): string {
  const date = DATE_FORMATTER.format(new Date(lead.createdAt));
  const interests = lead.interests.length > 0 ? `\n\u{1F3AF} ${lead.interests.join(', ')}` : '';
  return [
    `${index + offset + 1}. \u{1F4C5} ${date} \u00B7 ${lead.source}`,
    `\u{1F464} ${lead.name || '(sin nombre)'}`,
    `\u{1F4F1} ${lead.phone}`,
    `\u{1F4CD} ${lead.municipality}`,
    `\u{1F33E} ${lead.crop}${lead.area ? ` \u00B7 ${lead.area}` : ''}`,
    interests,
  ].filter(Boolean).join('\n');
}

async function handleCommand(text: string): Promise<void> {
  if (text === '/start') {
    await sendTelegramMessage(
      '\u{1F916} Bot de leads de Meteo Hu\u00e9scar.\n\nComandos disponibles:\n/leads \u2014 \u00FAltimos 5 leads\n/leads N \u2014 \u00FAltimos N leads (m\u00E1x. 15)\n/ayuda \u2014 esta ayuda',
    );
    return;
  }

  if (text === '/ayuda' || text === '/help') {
    await sendTelegramMessage(
      'Comandos:\n/leads \u2014 \u00FAltimos 5 leads\n/leads N \u2014 \u00FAltimos N leads (m\u00E1x. 15)',
    );
    return;
  }

  const matches = text.match(/^\/leads(?:\s+(\d{1,2}))?$/);
  if (matches) {
    const requested = matches[1] ? Number(matches[1]) : 5;
    const limit = Math.min(Math.max(requested, 1), MAX_LEADS);
    const leads = await getRecentLeads(limit);

    if (leads.length === 0) {
      await sendTelegramMessage('\u{1F4DD} No hay leads en la base de datos todav\u00EDa.');
      return;
    }

    const header = `\u{1F4CA} \u00DAltimos ${leads.length} lead${leads.length === 1 ? '' : 's'}`;
    const body = leads.map((lead, index) => formatRecentLead(lead, index, 0)).join('\n\n');
    await sendTelegramMessage(`${header}\n\n${body}`);
    return;
  }

  await sendTelegramMessage('Comando no reconocido. Escribe /ayuda.');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!token || secret !== token) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const message = payload?.message;
  if (!message || typeof message.text !== 'string') {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const ownerChatId = Number(process.env.TELEGRAM_NOTIFY_CHAT_ID);
  if (message.chat?.id !== ownerChatId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await handleCommand(message.text.trim());
  return NextResponse.json({ ok: true }, { status: 200 });
}