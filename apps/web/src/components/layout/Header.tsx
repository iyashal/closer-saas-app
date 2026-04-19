import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import TrialBanner from './TrialBanner';

export default function Header() {
  const { user, signOut } = useAuth();
  const org = useAuthStore((s) => s.org);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="shrink-0">
      <TrialBanner />
      <header className="h-14 bg-[#141414] border-b border-white/5 flex items-center justify-between px-6">
        <div className="text-sm text-gray-500">{org?.name ?? ''}</div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <Bell size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
                {initials}
              </div>
              <span className="text-sm text-gray-300 max-w-[140px] truncate">
                {user?.full_name ?? user?.email}
              </span>
              <ChevronDown size={14} className="text-gray-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
