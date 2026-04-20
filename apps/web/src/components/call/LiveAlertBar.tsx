interface Props {
  elapsedSeconds: number;
  closerRatio: number;
  highTalkRatioSince: number | null;
  lastTranscriptSeconds: number | null;
  hasPendingBuyingSignal: boolean;
}

type AlertLevel = 'red' | 'amber' | 'blue' | 'subtle';

interface Alert {
  message: string;
  level: AlertLevel;
}

function computeAlert(props: Props): Alert | null {
  const { elapsedSeconds, closerRatio, highTalkRatioSince, lastTranscriptSeconds, hasPendingBuyingSignal } = props;

  if (elapsedSeconds >= 3600) {
    return { message: '60 minutes. Consider booking a follow-up if they haven\'t decided.', level: 'red' };
  }
  if (elapsedSeconds >= 2700) {
    return { message: 'Call is running long — move toward the close.', level: 'amber' };
  }
  if (hasPendingBuyingSignal) {
    return { message: 'They showed interest — try a trial close.', level: 'blue' };
  }
  if (closerRatio > 0.6 && highTalkRatioSince !== null && (elapsedSeconds - highTalkRatioSince) >= 120) {
    return { message: 'You\'re talking too much — let them speak.', level: 'amber' };
  }
  if (lastTranscriptSeconds !== null && elapsedSeconds - lastTranscriptSeconds >= 8) {
    return { message: 'Good — let the silence work.', level: 'subtle' };
  }
  return null;
}

const levelClasses: Record<AlertLevel, string> = {
  red: 'text-red-400 bg-red-500/10 border-red-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  subtle: 'text-gray-500 bg-white/5 border-white/10 animate-pulse',
};

export function LiveAlertBar(props: Props) {
  const alert = computeAlert(props);
  if (!alert) return null;

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium
        transition-all duration-500
        ${levelClasses[alert.level]}
      `}
    >
      <span>{alert.message}</span>
    </div>
  );
}
