export type {
  UserRole,
  OrgPlan,
  CallStatus,
  CallOutcome,
  Framework,
  Organization,
  User,
  Offer,
  Call,
  TranscriptLine,
  FrameworkCard,
  RealtimeDetectionResult,
} from '@closer/shared';

import type { FastifyRequest } from 'fastify';
import type { User } from '@closer/shared';

export interface AuthenticatedRequest extends FastifyRequest {
  currentUser: User;
}
