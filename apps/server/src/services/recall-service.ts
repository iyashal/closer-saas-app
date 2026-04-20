// Transcription approach: Recall managed (hosted transcription).
// recording_config.transcript.provider.deepgram_streaming — Recall connects to Deepgram on our
// behalf using our API key. Transcripts arrive as webhook events (transcript.data for final
// utterances, transcript.partial_data for in-progress). We receive them at the same
// /webhooks/recall endpoint via recording_config.realtime_endpoints.

import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const RECALL_BASE = 'https://us-west-2.recall.ai/api/v1';

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
      recording_config: {
        transcript: {
          provider: {
            // Recall hosts the Deepgram connection; we receive results via webhook
            deepgram_streaming: {
              api_key: env.DEEPGRAM_API_KEY,
              model: 'nova-3',
              language: 'en',
            },
          },
        },
        // Push transcript events to our webhook handler in real time
        realtime_endpoints: [
          {
            type: 'webhook',
            url: options.webhook_url,
            events: ['transcript.data', 'transcript.partial_data'],
          },
        ],
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
