interface Props {
  value: 'own' | 'team';
  onChange: (v: 'own' | 'team') => void;
}

export default function ScopeToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center bg-[#1a1a1a] border border-white/5 rounded-lg p-0.5">
      {(['own', 'team'] as const).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === opt
              ? 'bg-[#141414] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {opt === 'own' ? 'My Calls' : 'Team Calls'}
        </button>
      ))}
    </div>
  );
}
