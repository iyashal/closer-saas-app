// With Recall hosted transcription, sessions are created/destroyed by webhook events
// (bot.in_call → startCallSession, bot.call_ended → stopCallSession).
// The /ws/recall/:callId WebSocket route is retained as a stub for potential future use
// (e.g., if we ever switch back to direct audio streaming on a different plan).

import type { FastifyInstance } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { logger } from '../lib/logger.js';
import { CallSession } from './call-session.js';

// ── Session state ──────────────────────────────────────────────────────────────

const activeSessions = new Map<string, CallSession>();

// Secondary index: botId → callId, to resolve transcript webhook events without a DB query
const botIdToCallId = new Map<string, string>();

// ── Public API ─────────────────────────────────────────────────────────────────

export async function startCallSession(
  callId: string,
  userId: string,
  orgId: string,
  botId: string,
): Promise<void> {
  if (activeSessions.has(callId)) {
    logger.warn({ callId }, 'Session already active — skipping duplicate start');
    return;
  }

  const session = new CallSession(callId, userId, orgId);
  activeSessions.set(callId, session);
  botIdToCallId.set(botId, callId);

  try {
    await session.start();
  } catch (err) {
    activeSessions.delete(callId);
    botIdToCallId.delete(botId);
    logger.error({ err, callId, userId, orgId }, 'Failed to start call session');
  }
}

export async function stopCallSession(callId: string): Promise<void> {
  const session = activeSessions.get(callId);
  if (!session) return;

  activeSessions.delete(callId);

  // Clean up the reverse index
  for (const [botId, cid] of botIdToCallId) {
    if (cid === callId) {
      botIdToCallId.delete(botId);
      break;
    }
  }

  try {
    await session.stop();
  } catch (err) {
    logger.error({ err, callId }, 'Error stopping call session');
  }
}

export function getSession(callId: string): CallSession | undefined {
  return activeSessions.get(callId);
}

/** Resolve a Recall bot ID to its active callId without a DB query. */
export function getCallIdForBot(botId: string): string | undefined {
  return botIdToCallId.get(botId);
}

export async function stopAllSessions(): Promise<void> {
  const ids = [...activeSessions.keys()];
  if (ids.length > 0) {
    logger.info({ count: ids.length }, 'Stopping all active call sessions');
  }
  await Promise.allSettled(ids.map((id) => stopCallSession(id)));
}

export function getActiveSessionCount(): number {
  return activeSessions.size;
}

// ── WebSocket route (stub) ─────────────────────────────────────────────────────

export async function registerWsRoutes(app: FastifyInstance): Promise<void> {
  // Stub: direct audio streaming is not supported on this Recall.ai plan.
  // Route is kept so the server starts cleanly and can be enabled in future.
  app.get(
    '/ws/recall/:callId',
    { websocket: true },
    (connection: SocketStream) => {
      const socket = connection.socket;
      logger.warn('Incoming connection on /ws/recall — direct audio streaming is not enabled on this plan');
      socket.close(1011, 'Direct audio streaming not supported on this plan');
    },
  );
}
