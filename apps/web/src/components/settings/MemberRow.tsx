import { useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import type { UserRole } from '@/types';

interface MemberRowData {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  last_active_at: string | null;
  calls_this_week: number;
}

interface MemberRowProps {
  member: MemberRowData;
  currentUserId: string;
  currentUserRole: UserRole;
  onRoleChange: (memberId: string, newRole: 'admin' | 'closer') => Promise<void>;
  onRemove: (memberId: string, name: string) => void;
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  admin: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  closer: 'bg-white/5 text-gray-400 border-white/10',
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MemberRow({ member, currentUserId, currentUserRole, onRoleChange, onRemove }: MemberRowProps) {
  const [changingRole, setChangingRole] = useState(false);
  const isSelf = member.id === currentUserId;
  const isOwner = member.role === 'owner';
  const canEditRole = currentUserRole === 'owner' && !isSelf && !isOwner;
  const canRemove = currentUserRole === 'owner' && !isSelf && !isOwner;

  const initials = member.full_name
    ? member.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : member.email[0].toUpperCase();

  async function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as 'admin' | 'closer';
    setChangingRole(true);
    try {
      await onRoleChange(member.id, newRole);
    } finally {
      setChangingRole(false);
    }
  }

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-white/5 last:border-0">
      <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center text-sm font-semibold text-blue-400 shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {member.full_name ?? member.email}
            {isSelf && <span className="text-gray-600 font-normal ml-1">(you)</span>}
          </span>
        </div>
        <div className="text-xs text-gray-500 truncate">{member.email}</div>
      </div>

      <div className="text-xs text-gray-500 text-right shrink-0 hidden sm:block">
        <div>{member.calls_this_week} call{member.calls_this_week !== 1 ? 's' : ''} this week</div>
        <div>Active {timeAgo(member.last_active_at)}</div>
      </div>

      <div className="shrink-0">
        {canEditRole ? (
          <div className="relative">
            <select
              value={member.role}
              onChange={handleRoleChange}
              disabled={changingRole}
              className="appearance-none bg-white/5 border border-white/10 rounded-md pl-2.5 pr-7 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
            >
              <option value="closer">Closer</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        ) : (
          <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium border ${ROLE_COLORS[member.role]}`}>
            {member.role}
          </span>
        )}
      </div>

      {canRemove && (
        <button
          onClick={() => onRemove(member.id, member.full_name ?? member.email)}
          className="shrink-0 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          title="Remove member"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
