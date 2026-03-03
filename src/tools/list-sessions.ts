import { z } from 'zod';
import { listSessions } from '../session/manager.js';

export const listSessionsSchema = z.object({});

export type ListSessionsInput = z.infer<typeof listSessionsSchema>;

export function handleListSessions() {
  const sessions = listSessions();
  if (sessions.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'No active audit sessions. Start one with checkup_start_audit.',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            activeSessions: sessions.map(s => ({
              ...s,
              currentPhase: s.currentPhaseIndex + 1,
              resumeHint: s.status === 'in_progress'
                ? `Call checkup_start_audit with resumeSessionId="${s.id}" to resume.`
                : undefined,
            })),
          },
          null,
          2,
        ),
      },
    ],
  };
}
