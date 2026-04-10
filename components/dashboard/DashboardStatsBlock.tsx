'use client';

import { useRouter } from 'next/navigation';
import { Users, UserCheck, UserPlus, UserX, Target, Ban } from 'lucide-react';

interface DashboardStatsBlockProps {
  rechargeTarget?: string;
  totalClients?: number;
  activeClients?: number;
  newClients?: number;
  disabledClients?: number;
  expiredClients?: number;
  suspendedClients?: number;
}

export default function DashboardStatsBlock({
  rechargeTarget = '',
  totalClients = 0,
  activeClients = 0,
  newClients = 0,
  disabledClients = 0,
  expiredClients = 0,
  suspendedClients = 0,
}: DashboardStatsBlockProps) {
  const router = useRouter();

  return (
    <div className="rounded-2xl w-full">
      <h1 className="text-2xl font-normal text-gray-800 dark:text-white mb-4">
        Overall Statistics
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 */}
        {/* Card 1: Your Recharge Target (spans 2 columns) */}
        <button
          onClick={() => router.push('/dashboard/clients')}
          className="group col-span-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-violet-900 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-indigo-200/60 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-500/5 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          aria-label={`Recharge Target: ${rechargeTarget}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Your Recharge Target
              </p>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 transition-transform duration-200 group-hover:scale-110">
              <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold bg-linear-to-r from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent">
            {rechargeTarget}
          </p>
        </button>

        {/* Card 2: Total Clients */}
        <button
          onClick={() => router.push('/dashboard/clients')}
          className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-blue-200/60 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40 hover:bg-blue-50/80 dark:hover:bg-blue-500/5 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          aria-label={`Total Clients: ${totalClients.toLocaleString()}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 transition-transform duration-200 group-hover:scale-110">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold bg-linear-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            {totalClients.toLocaleString()}
          </p>
        </button>

        {/* Card 3: Active Clients */}
        <button
          onClick={() => router.push('/dashboard/clients?status=active')}
          className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-emerald-200/60 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          aria-label={`Active Clients: ${activeClients.toLocaleString()}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active
              </p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 transition-transform duration-200 group-hover:scale-110">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold bg-linear-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
            {activeClients.toLocaleString()}
          </p>
        </button>

        {/* Row 2 */}
        {/* Card 4: New Clients */}
        <button
          onClick={() => router.push('/dashboard/clients')}
          className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-violet-200/60 dark:border-violet-500/20 hover:border-violet-300 dark:hover:border-violet-500/40 hover:bg-violet-50/80 dark:hover:bg-violet-500/5 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          aria-label={`New Clients: ${newClients.toLocaleString()} in last 30 days`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                New
              </p>
            </div>
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-500/10 transition-transform duration-200 group-hover:scale-110">
              <UserPlus className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold bg-linear-to-r from-violet-600 to-violet-500 dark:from-violet-400 dark:to-violet-300 bg-clip-text text-transparent">
            {newClients.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Last 30 days
          </p>
        </button>

        {/* Card 5: Suspended Clients */}
        <button
          onClick={() => router.push('/dashboard/clients?status=suspended')}
          className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-amber-200/60 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 hover:bg-amber-50/80 dark:hover:bg-amber-500/5 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          aria-label={`Suspended Clients: ${suspendedClients.toLocaleString()}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Disabled
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 transition-transform duration-200 group-hover:scale-110">
              <Ban className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold bg-linear-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
            {suspendedClients.toLocaleString()}
          </p>
        </button>

        {/* Card 6: Expired Clients */}
        <button
          onClick={() => router.push('/dashboard/clients?status=expired')}
          className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-500/40 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 hover:shadow-lg hover:shadow-gray-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          aria-label={`Expired Clients: ${expiredClients.toLocaleString()}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Expired
              </p>
            </div>
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-500/10 transition-transform duration-200 group-hover:scale-110">
              <UserX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold bg-linear-to-r from-gray-600 to-gray-500 dark:from-gray-400 dark:to-gray-300 bg-clip-text text-transparent">
            {expiredClients.toLocaleString()}
          </p>
        </button>
      </div>
    </div>
  );
}
