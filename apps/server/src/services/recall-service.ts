import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const RECALL_BASE = 'https://us-east-1.recall.ai/api/v1';

interface CreateBotOptions {
  meeting_url: string;
  bot_name: string;
  webhook_url: string;
}

interface RecallBot {
  id: string;
  meeting_url: string;
  bot_name: string;
  status: { code: string };
}

async function recallFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${RECALL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${env.RECALL_API_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall API error ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function createBot(options: CreateBotOptions): Promise<RecallBot> {
  logger.info({ meeting_url: options.meeting_url, bot_name: options.bot_name }, 'Creating Recall bot');

  const bot = await recallFetch<RecallBot>('/bot/', {
    method: 'POST',
    body: JSON.stringify({
      meeting_url: options.meeting_url,
      bot_name: options.bot_name,
      webhook_url: options.webhook_url,
      real_time_transcription: {
        destination_url: options.webhook_url.replace('/webhooks/recall', '/webhooks/recall/transcript'),
        partial_results: true,
      },
    }),
  });

  logger.info({ botId: bot.id }, 'Recall bot created');
  return bot;
}

export async function removeBot(botId: string): Promise<void> {
  logger.info({ botId }, 'Removing Recall bot');

  try {
    await recallFetch<void>(`/bot/${botId}/leave_call/`, { method: 'POST' });
    logger.info({ botId }, 'Recall bot removed');
  } catch (err) {
    logger.error({ err, botId }, 'Failed to remove Recall bot');
    throw err;
  }
}
