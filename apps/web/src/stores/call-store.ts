import { create } from 'zustand';
import type { Call, TranscriptLine, FrameworkCard } from '@/types';

interface CallState {
  activeCall: Call | null;
  transcriptLines: TranscriptLine[];
  pendingCueCards: FrameworkCard[];
  talkRatioCloser: number;
  talkRatioProspect: number;
  setActiveCall: (call: Call | null) => void;
  appendTranscriptLine: (line: TranscriptLine) => void;
  addCueCard: (card: FrameworkCard) => void;
  dismissCueCard: (cardId: string) => void;
  setTalkRatio: (closer: number, prospect: number) => void;
  reset: () => void;
}

const initialState = {
  activeCall: null,
  transcriptLines: [],
  pendingCueCards: [],
  talkRatioCloser: 0,
  talkRatioProspect: 0,
};

export const useCallStore = create<CallState>((set) => ({
  ...initialState,
  setActiveCall: (call) => set({ activeCall: call }),
  appendTranscriptLine: (line) =>
    set((s) => ({ transcriptLines: [...s.transcriptLines, line] })),
  addCueCard: (card) =>
    set((s) => ({
      pendingCueCards: [...s.pendingCueCards, card].slice(-4),
    })),
  dismissCueCard: (cardId) =>
    set((s) => ({ pendingCueCards: s.pendingCueCards.filter((c) => c.id !== cardId) })),
  setTalkRatio: (closer, prospect) =>
    set({ talkRatioCloser: closer, talkRatioProspect: prospect }),
  reset: () => set(initialState),
}));
