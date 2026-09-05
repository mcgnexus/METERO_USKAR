#!/usr/bin/env node
// Registra el webhook del bot en Telegram.
// Uso:
//   TELEGRAM_NOTIFY_BOT_TOKEN=... \
//   TELEGRAM_NOTIFY_CHAT_ID=... \
//   TELEGRAM_WEBHOOK_URL=https://meteo.tecrural.es/api/telegram/webhook \
//   TELEGRAM_WEBHOOK_SECRET=... \
//   node scripts/set-telegram-webhook.mjs

const token = process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
const url = process.env.TELEGRAM_WEBHOOK_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !chatId || !url || !secret) {
  console.error('Faltan variables: TELEGRAM_NOTIFY_BOT_TOKEN, TELEGRAM_NOTIFY_CHAT_ID, TELEGRAM_WEBHOOK_URL, TELEGRAM_WEBHOOK_SECRET');
  process.exit(1);
}

const telegramUrl = `https://api.telegram.org/bot${token}/setWebhook`;
const body = {
  url,
  secret_token: secret,
  allowed_updates: ['message'],
};

try {
  const res = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  if (!data.ok) process.exit(1);
} catch (err) {
  console.error('Error llamando a setWebhook:', err instanceof Error ? err.message : err);
  process.exit(1);
}