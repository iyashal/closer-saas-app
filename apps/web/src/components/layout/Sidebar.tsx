import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  PhoneCall,
  Clock,
  BookOpen,
  BarChart2,
  Users,
  Settings,
  Zap,
  Tag,
} from 'lucide-react';
import { useOrg } from '@/hooks/use-org';
import { api } from '@/lib/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/call/new', icon: PhoneCall, label: 'New Call' },
  { to: '/calls', icon: Clock, label: 'Call History' },
  { to: '/frameworks', icon: BookOpen, label: 'Frameworks' },
  { to: '/offers', icon: Tag, label: 'Offers' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
];

export default function Sidebar() {
  const { isTeamPlan, isAdmin } = useOrg();
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const fetch = () => {
      api
        .get<{ id: string }[]>('/dashboard/live-calls')
        .then((d) => setLiveCount(d.length))
        .catch(() => {});
    };
    fetch();
    const id = setInterval(fetch, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="w-56 bg-[#141414] border-r border-white/5 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-white/5 flex items-center gap-2">
        <Zap size={18} className="text-blue-400 shrink-0" />
        <span className="font-bold text-xl text-white">CloseForce</span>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {to === '/dashboard' && liveCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                {liveCount}
              </span>
            )}
          </NavLink>
        ))}

        {isTeamPlan && isAdmin && (
          <NavLink
            to="/team"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Users size={16} />
            Team
          </NavLink>
        )}
      </nav>

      <div className="p-3 border-t border-white/5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          <Settings size={16} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
