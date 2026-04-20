import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function CallSummaryPage() {
  const { callId } = useParams<{ callId: string }>();

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <Loader2 size={28} className="animate-spin text-gray-500" />
      <div className="text-center space-y-1">
        <p className="text-white font-medium">Call ended. Summary coming soon.</p>
        <p className="text-sm text-gray-500">
          Post-call AI analysis is being generated for call{' '}
          <span className="font-mono text-gray-400">{callId?.slice(0, 8)}</span>.
        </p>
      </div>
      <Link
        to="/dashboard"
        className="text-blue-400 hover:underline text-sm"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
