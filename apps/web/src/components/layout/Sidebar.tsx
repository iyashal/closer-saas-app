import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PhoneCall,
  Clock,
  BookOpen,
  BarChart2,
  Users,
  Settings,
} from 'lucide-react';
import { useOrg } from '@/hooks/use-org';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/call/new', icon: PhoneCall, label: 'New Call' },
  { to: '/calls', icon: Clock, label: 'Call History' },
  { to: '/frameworks', icon: BookOpen, label: 'Frameworks' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
];

export default function Sidebar() {
  const { isTeamPlan, isAdmin } = useOrg();

  return (
    <aside className="w-56 bg-[#141414] border-r border-white/5 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-white/5">
        <img src="/logo.svg" alt="CloseForce" className="h-7" />
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
            {label}
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
