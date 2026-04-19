import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

interface InviteData {
  id: string;
  email: string;
  role: string;
  org_name: string;
  expires_at: string;
}

type PageState = 'loading' | 'valid' | 'invalid' | 'done';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>('loading');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [invalidMessage, setInvalidMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setState('invalid'); setInvalidMessage('Invalid invitation link.'); return; }

    fetch(`/api/invitations/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json() as { message?: string };
          setInvalidMessage(body.message ?? 'This invitation is no longer valid.');
          setState('invalid');
          return;
        }
        const data = await res.json() as InviteData;
        setInvite(data);
        setState('valid');
      })
      .catch(() => {
        setInvalidMessage('Failed to load invitation. Please try again.');
        setState('invalid');
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite || !token) return;
    setError('');
    setSubmitting(true);

    try {
      // Sign up via Supabase auth (email pre-filled from invite)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!data.session) throw new Error('Check your email to confirm your account first, then return to this link.');

      // Accept the invitation (creates the user DB row with the org)
      await api.post(`/invitations/${token}/accept`, { full_name: fullName });

      setState('done');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-white mb-2">You're in!</h2>
          <p className="text-gray-400 text-sm">Taking you to the dashboard…</p>
        </div>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-[#141414] border border-white/10 rounded-xl p-8">
            <div className="text-3xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-white mb-2">Invitation unavailable</h2>
            <p className="text-sm text-gray-400">{invalidMessage}</p>
            <p className="text-sm text-gray-600 mt-3">Contact the person who invited you to get a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  // state === 'valid'
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-white mb-1">CloseForce.io</div>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-xl p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-white mb-1">
              Join {invite?.org_name}
            </h1>
            <p className="text-sm text-gray-500">
              You've been invited as a <span className="text-white capitalize">{invite?.role}</span>.
              Create your account to accept.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jordan Smith"
                required
                autoFocus
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={invite?.email ?? ''}
                disabled
                className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2.5 text-gray-400 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-600 mt-1">Locked to the invited email.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !fullName || !password}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Creating account…' : 'Accept invitation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
