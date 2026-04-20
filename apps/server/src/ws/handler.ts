// NOTE: Recall.ai connects to this WebSocket endpoint to stream audio from the bot.
// This requires the server to be publicly accessible. In local dev behind NAT/WSL2,
// Recall.ai cannot reach this endpoint. Use ngrok or deploy to Railway to test end-to-end.

import type { FastifyInstance } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { CallSession } from './call-session.js';

const activeSessions = new Map<string, CallSession>();

export async function registerWsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/ws/recall/:callId',
    { websocket: true },
    async (connection: SocketStream, request) => {
      const { callId } = request.params as { callId: string };
      const socket = connection.socket;
      logger.info({ callId }, 'Recall audio WebSocket connected');

      try {
        const { data: call } = await supabase
          .from('calls')
          .select('id, user_id, org_id, status')
          .eq('id', callId)
          .maybeSingle();

        if (!call) {
          logger.warn({ callId }, 'No call record found for incoming Recall stream — rejecting');
          socket.close(1008, 'Call not found');
          return;
        }

        if (call.status !== 'live' && call.status !== 'bot_joining') {
          logger.warn({ callId, status: call.status }, 'Call not active — rejecting audio stream');
          socket.close(1008, 'Call not active');
          return;
        }

        const session = new CallSession(call.id, call.user_id, call.org_id, socket);
        activeSessions.set(callId, session);

        socket.on('close', () => {
          logger.info({ callId }, 'Recall audio stream closed — cleaning up session');
          stopCallSession(callId).catch((err) =>
            logger.error({ err, callId }, 'Error stopping session on socket close'),
          );
        });

        await session.start();
      } catch (err) {
        logger.error({ err, callId }, 'Error initialising call session');
        socket.close(1011, 'Internal error');
      }
    },
  );
}

export async function stopCallSession(callId: string): Promise<void> {
  const session = activeSessions.get(callId);
  if (!session) return;

  activeSessions.delete(callId);

  try {
    await session.stop();
  } catch (err) {
    logger.error({ err, callId }, 'Error stopping call session');
  }
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
