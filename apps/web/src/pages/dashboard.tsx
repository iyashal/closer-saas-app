import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Phone, DollarSign, Target, Radio, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTrial } from '@/hooks/use-trial';
import { api } from '@/lib/api';
import type { Call } from '@/types';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}

function StatCard({ label, value, icon, sub }: StatCardProps) {
  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="text-gray-600">{icon}</div>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isExpired } = useTrial();
  const [liveCalls, setLiveCalls] = useState<Call[]>([]);

  useEffect(() => {
    api
      .get<Call[]>('/calls')
      .then((calls) =>
        setLiveCalls(calls.filter((c) => c.status === 'live' || c.status === 'bot_joining')),
      )
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex-1 overflow-y-auto p-6 space-y-6">
      {isExpired && (
        <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-semibold text-white mb-2">Your trial has ended</h2>
            <p className="text-gray-400 text-sm mb-6">
              Upgrade to keep AI coaching on every call. Your past data stays accessible.
            </p>
            <a
              href="/settings/billing"
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg text-sm transition-colors"
            >
              View plans &amp; upgrade
            </a>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {user?.full_name ? `Hey, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your performance overview.</p>
        </div>
        <Link
          to="/call/new"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New Call
        </Link>
      </div>

      {liveCalls.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-green-300 flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            Live Now
          </h2>
          <div className="space-y-2">
            {liveCalls.map((c) => (
              <Link
                key={c.id}
                to={`/call/${c.id}`}
                className="flex items-center justify-between bg-[#141414] border border-white/5 rounded-lg px-4 py-2.5 hover:border-green-500/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Radio size={15} className="text-green-400" />
                  <span className="text-sm text-white">
                    {c.prospect_name ? `Call with ${c.prospect_name}` : 'Active call'}
                  </span>
                </div>
                <span className="text-xs text-green-400">
                  {c.status === 'bot_joining' ? 'Bot joining…' : 'Live'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Close Rate"
          value="—"
          icon={<TrendingUp size={18} />}
          sub="No calls yet"
        />
        <StatCard
          label="Calls This Week"
          value="0"
          icon={<Phone size={18} />}
          sub="No calls yet"
        />
        <StatCard
          label="Revenue Closed"
          value="$0"
          icon={<DollarSign size={18} />}
          sub="No calls yet"
        />
        <StatCard
          label="Avg Deal Size"
          value="—"
          icon={<Target size={18} />}
          sub="No calls yet"
        />
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone size={22} className="text-blue-400" />
        </div>
        <h3 className="text-white font-medium mb-1">No calls yet</h3>
        <p className="text-sm text-gray-500 mb-5">
          Launch your first bot and get live coaching on your next sales call.
        </p>
        <Link
          to="/call/new"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Plus size={15} />
          New Call
        </Link>
      </div>
    </div>
  );
}
