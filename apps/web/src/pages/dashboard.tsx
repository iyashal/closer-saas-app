import { TrendingUp, Phone, DollarSign, Target } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTrial } from '@/hooks/use-trial';

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

      <div>
        <h1 className="text-xl font-semibold text-white">
          {user?.full_name ? `Hey, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's your performance overview.</p>
      </div>

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
        <button
          disabled
          className="bg-blue-600/50 text-white/50 cursor-not-allowed font-medium px-5 py-2.5 rounded-lg text-sm"
          title="Coming in Module 4"
        >
          New Call
        </button>
      </div>
    </div>
  );
}
