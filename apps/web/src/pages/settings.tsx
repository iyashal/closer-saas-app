import { useState, useEffect } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, Building2, Bell, CreditCard, Trash2, UserPlus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useOrg } from '@/hooks/use-org';
import { useAuthStore } from '@/stores/auth-store';
import RoleGate from '@/components/RoleGate';
import InviteModal from '@/components/settings/InviteModal';
import MemberRow from '@/components/settings/MemberRow';
import type { UserRole, Invitation, User as UserRecord } from '@/types';

// ─── Shared Tab Nav ──────────────────────────────────────────────────────────

function SettingsNav() {
  const { isAdmin, isOwner } = useOrg();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`;

  return (
    <nav className="w-44 shrink-0 space-y-0.5">
      <NavLink to="/settings/profile" className={linkClass}><User size={15} />Profile</NavLink>
      {isOwner && <NavLink to="/settings/organization" className={linkClass}><Building2 size={15} />Organization</NavLink>}
      {isAdmin && (
        <NavLink to="/settings/members" className={linkClass}><Users size={15} />Members</NavLink>
      )}
      <NavLink to="/settings/notifications" className={linkClass}><Bell size={15} />Notifications</NavLink>
      <NavLink to="/settings/billing" className={linkClass}><CreditCard size={15} />Billing</NavLink>
      <NavLink to="/settings/danger" className={linkClass}><Trash2 size={15} />Danger Zone</NavLink>
    </nav>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuth();
  const { setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await api.patch<typeof user>('/users/me', { full_name: fullName });
      if (updated) setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        <p className="text-sm text-gray-500 mt-0.5">Your personal account details.</p>
      </div>
      <form onSubmit={handleSave} className="bg-[#141414] border border-white/5 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Email</label>
          <input
            type="email"
            value={user?.email ?? ''}
            disabled
            className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-2.5 text-gray-500 text-sm cursor-not-allowed"
          />
          <p className="text-xs text-gray-600 mt-1">Email cannot be changed here.</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

// ─── Organization Tab ─────────────────────────────────────────────────────────

function OrganizationTab() {
  const { org, setOrg } = useAuthStore();
  const [name, setName] = useState(org?.name ?? '');
  const [botName, setBotName] = useState(org?.settings?.bot_display_name ?? '');
  const [consent, setConsent] = useState(org?.settings?.consent_disclosure_text ?? '');
  const [retention, setRetention] = useState(String(org?.settings?.data_retention_days ?? 90));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await api.patch<typeof org>('/org', {
        name: name.trim(),
        settings: {
          bot_display_name: botName.trim(),
          consent_disclosure_text: consent.trim(),
          data_retention_days: parseInt(retention, 10) || 90,
        },
      });
      if (updated && org) setOrg({ ...org, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Organization</h2>
        <p className="text-sm text-gray-500 mt-0.5">Workspace settings visible to your team.</p>
      </div>
      <form onSubmit={handleSave} className="bg-[#141414] border border-white/5 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Workspace name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Bot display name <span className="text-gray-600">(what the bot is called in meetings)</span>
          </label>
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder={`${org?.name ?? 'Your Team'} Notes`}
            maxLength={80}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-gray-600 mt-1">Leave blank to use "{org?.name ?? 'Your Team'} Notes"</p>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Consent disclosure text <span className="text-gray-600">(optional — bot will read this when joining)</span>
          </label>
          <textarea
            value={consent}
            onChange={(e) => setConsent(e.target.value)}
            placeholder="This call may be recorded for coaching and quality purposes."
            rows={2}
            maxLength={500}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Data retention (days)</label>
          <input
            type="number"
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
            min="1"
            max="365"
            className="w-36 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-gray-600 mt-1">Call recordings and transcripts are deleted after this period.</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

interface OrgMember {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  last_active_at: string | null;
  calls_this_week: number;
}

function MembersTab() {
  const { user } = useAuth();
  const { org, isTeamPlan } = useOrg();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  async function load() {
    try {
      const [membersData, invitesData] = await Promise.all([
        api.get<OrgMember[]>('/users/org-members'),
        api.get<Invitation[]>('/invitations'),
      ]);
      setMembers(membersData);
      setInvitations(invitesData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (!isTeamPlan) {
    return (
      <div className="max-w-lg">
        <div className="bg-[#141414] border border-white/5 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={22} className="text-blue-400" />
          </div>
          <h3 className="text-white font-medium mb-1">Invite your team</h3>
          <p className="text-sm text-gray-500 mb-5">
            Upgrade to Team plan to invite closers, view team analytics, and see the leaderboard.
          </p>
          <a
            href="/settings/billing"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Upgrade to Team
          </a>
        </div>
      </div>
    );
  }

  async function handleRoleChange(memberId: string, newRole: 'admin' | 'closer') {
    await api.patch(`/users/${memberId}/role`, { role: newRole });
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.delete(`/users/${removeTarget.id}`);
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch {
      // silent — keep modal open on error
    } finally {
      setRemoving(false);
    }
  }

  async function handleRevokeInvite(id: string) {
    await api.delete(`/invitations/${id}`);
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));
  }

  const maxSeats = org?.max_seats ?? 1;
  const usedSeats = members.length;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Members</h2>
          <p className="text-sm text-gray-500 mt-0.5">{usedSeats}/{maxSeats} seats used</p>
        </div>
        <RoleGate roles={['owner', 'admin']}>
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={usedSeats >= maxSeats}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <UserPlus size={15} />
            Invite member
          </button>
        </RoleGate>
      </div>

      {usedSeats >= maxSeats && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm text-amber-400">
          All {maxSeats} seats are in use.{' '}
          <a href="/settings/billing" className="underline">Add more seats in billing.</a>
        </div>
      )}

      <div className="bg-[#141414] border border-white/5 rounded-xl px-5">
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-600">Loading…</div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={user?.id ?? ''}
              currentUserRole={user?.role ?? 'closer'}
              onRoleChange={handleRoleChange}
              onRemove={(id, name) => setRemoveTarget({ id, name })}
            />
          ))
        )}
      </div>

      {invitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400">Pending invitations</h3>
          <div className="bg-[#141414] border border-white/5 rounded-xl divide-y divide-white/5">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-sm text-white">{inv.email}</div>
                  <div className="text-xs text-gray-500">
                    Invited as {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => void handleRevokeInvite(inv.id)}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => { setShowInviteModal(false); void load(); }}
        />
      )}

      {removeTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-white font-semibold mb-2">Remove member?</h3>
            <p className="text-sm text-gray-400 mb-5">
              <span className="text-white">{removeTarget.name}</span> will lose access to your workspace immediately.
              Their past call data remains in your account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveTarget(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRemoveConfirm()}
                disabled={removing}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────────────────

const NOTIFICATION_PREFS = [
  { key: 'email_call_summary', label: 'Call summary ready', channel: 'Email', description: 'When AI finishes processing your call' },
  { key: 'email_trial_expiring', label: 'Trial expiring', channel: 'Email', description: '7 days and 2 days before trial ends' },
  { key: 'email_weekly_digest', label: 'Weekly digest', channel: 'Email', description: 'Your stats every Monday morning' },
  { key: 'email_payment_failed', label: 'Payment failed', channel: 'Email', description: 'When a billing charge fails' },
  { key: 'in_app_cue_card_sound', label: 'Cue card sound', channel: 'In-app', description: 'Chime when a new cue card appears' },
  { key: 'in_app_low_talk_ratio_alert', label: 'Talk ratio warning', channel: 'In-app', description: 'Alert when you\'re talking too much' },
  { key: 'in_app_call_duration_warning', label: 'Call duration warning', channel: 'In-app', description: 'At 45 and 60 minutes' },
] as const;

type PrefKey = typeof NOTIFICATION_PREFS[number]['key'];

function NotificationsTab() {
  const { user } = useAuth();
  const { setUser } = useAuthStore();
  const [prefs, setPrefs] = useState(() => user?.notification_preferences ?? {
    email_weekly_digest: true,
    email_call_summary: true,
    email_trial_expiring: true,
    email_payment_failed: true,
    in_app_cue_card_sound: true,
    in_app_low_talk_ratio_alert: true,
    in_app_call_duration_warning: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function toggle(key: PrefKey) {
    const previous = prefs;
    const newPrefs = { ...prefs, [key]: !prefs[key as keyof typeof prefs] };
    setPrefs(newPrefs);
    setSaving(true);
    setSaveError('');
    try {
      const updated = await api.patch<UserRecord>('/users/me', { notification_preferences: newPrefs });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setPrefs(previous);
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Notifications</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Control which alerts you receive. Changes save automatically.
          {saving && <span className="text-blue-400 ml-2">Saving…</span>}
          {!saving && saved && <span className="text-green-400 ml-2">Saved</span>}
          {saveError && <span className="text-red-400 ml-2">{saveError}</span>}
        </p>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-xl divide-y divide-white/5">
        {NOTIFICATION_PREFS.map(({ key, label, channel, description }) => {
          const checked = Boolean(prefs[key as keyof typeof prefs]);
          return (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{label}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-gray-500">{channel}</span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">{description}</div>
              </div>
              <button
                onClick={() => void toggle(key)}
                className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-white/10'}`}
                style={{ height: '22px', width: '40px' }}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Billing Tab ─────────────────────────────────────────────────────────────

function BillingTab() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Billing</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your subscription and payment method.</p>
      </div>
      <div className="bg-[#141414] border border-white/5 rounded-xl p-8 text-center">
        <CreditCard size={28} className="mx-auto text-gray-600 mb-3" />
        <p className="text-sm text-gray-500">Billing management coming soon.</p>
      </div>
    </div>
  );
}

// ─── Danger Zone Tab ─────────────────────────────────────────────────────────

function DangerZoneTab() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
        <p className="text-sm text-gray-500 mt-0.5">Irreversible actions. Proceed with care.</p>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-xl divide-y divide-white/5">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Sign out</div>
            <div className="text-xs text-gray-500 mt-0.5">End your current session</div>
          </div>
          <button
            onClick={() => void handleSignOut()}
            className="bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-red-400">Delete account</div>
            <div className="text-xs text-gray-500 mt-0.5">Permanently delete your account and all data</div>
          </div>
          <button
            onClick={() => setShowDelete(true)}
            className="bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-white font-semibold mb-2">Delete your account?</h3>
            <p className="text-sm text-gray-400 mb-4">
              This is permanent. All your calls, transcripts, and data will be deleted immediately and cannot be recovered.
            </p>
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1.5">Type <span className="text-white font-mono">delete my account</span> to confirm</label>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="delete my account"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDelete(false); setConfirm(''); }}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={confirm !== 'delete my account'}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>
        <div className="flex gap-8">
          <SettingsNav />
          <div className="flex-1 min-w-0">
            <Routes>
              <Route path="profile" element={<ProfileTab />} />
              <Route
                path="organization"
                element={
                  <RoleGate roles={['owner']} fallback={<Navigate to="/settings/profile" replace />}>
                    <OrganizationTab />
                  </RoleGate>
                }
              />
              <Route path="members" element={<MembersTab />} />
              <Route path="notifications" element={<NotificationsTab />} />
              <Route path="billing" element={<BillingTab />} />
              <Route path="danger" element={<DangerZoneTab />} />
              <Route path="*" element={<Navigate to="profile" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
