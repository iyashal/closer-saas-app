import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

interface InviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteModal({ onClose, onSuccess }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'closer' | 'admin'>('closer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/invitations', { email, role });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Invite member</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="closer@example.com"
              required
              autoFocus
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'closer' | 'admin')}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="closer">Closer — can launch bots, view own calls</option>
              <option value="admin">Admin — can view all calls, manage team</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
