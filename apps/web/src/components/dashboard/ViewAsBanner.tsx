interface Props {
  viewingName: string | null;
  onExit: () => void;
}

export default function ViewAsBanner({ viewingName, onExit }: Props) {
  return (
    <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-blue-300">
        Viewing dashboard as <strong className="text-white">{viewingName ?? 'Closer'}</strong>
      </span>
      <button
        onClick={onExit}
        className="text-xs text-blue-400 hover:text-white transition-colors font-medium"
      >
        Exit view
      </button>
    </div>
  );
}
