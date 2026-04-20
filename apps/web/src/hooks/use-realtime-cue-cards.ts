import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { FrameworkCard } from '@/types';
import type { ActiveCueCard } from '@/components/call/CueCard';

interface CuePayload {
  shown_id: string;
  card: FrameworkCard;
  trigger_text: string | null;
  confidence: number;
}

interface Options {
  onCardArrived?: (card: ActiveCueCard) => void;
}

export function useRealtimeCueCards(callId: string, options: Options = {}) {
  const [cards, setCards] = useState<ActiveCueCard[]>([]);
  const onCardArrivedRef = useRef(options.onCardArrived);
  onCardArrivedRef.current = options.onCardArrived;

  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel(`call:${callId}:cues`)
      .on('broadcast', { event: 'cue_card' }, ({ payload }) => {
        const p = payload as CuePayload;
        const newCard: ActiveCueCard = {
          shownId: p.shown_id,
          card: p.card,
          triggerText: p.trigger_text,
          confidence: p.confidence,
          shownAt: Date.now(),
        };
        setCards((prev) => [...prev, newCard].slice(-4));
        onCardArrivedRef.current?.(newCard);
      })
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [callId]);

  const dismiss = useCallback((shownId: string) => {
    setCards((prev) => prev.filter((c) => c.shownId !== shownId));
  }, []);

  const markUsed = useCallback((shownId: string) => {
    setCards((prev) => prev.filter((c) => c.shownId !== shownId));
  }, []);

  return { cards, dismiss, markUsed };
}
