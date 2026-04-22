'use client';

import { useState, useEffect } from 'react';
import { Clock, ArrowRightLeft, History, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface ArrearsData {
  pendingRecovery: number;
  totalArrears: number;
  currentMonthData: {
    year: number;
    month: number;
    pendingRecovery: number;
    totalArrears: number;
  } | null;
  history: Array<{
    id: string;
    year: number;
    month: number;
    pendingRecoveryAmount: number;
    amountRolledOver: number;
    cumulativeArrears: number;
    rolloverType: 'automatic' | 'manual';
    createdAt: string;
  }>;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ArrearsPage() {
  const [data, setData] = useState<ArrearsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rollingOver, setRollingOver] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/arrears', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch arrears data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRollover = async () => {
    if (!confirm('Are you sure you want to rollover pending recovery to total arrears? This moves the current month\'s unpaid amount to cumulative arrears.')) {
      return;
    }

    try {
      setRollingOver(true);
      setMessage(null);
      const res = await fetch('/api/dashboard/arrears', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollover', type: 'manual' }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setMessage({
          type: 'success',
          text: `Rollover complete! Rs ${json.pendingRecovery.toLocaleString()} added to arrears. New total: Rs ${json.newTotalArrears.toLocaleString()}`,
        });
        fetchData();
      } else {
        setMessage({
          type: 'error',
          text: json.error || 'Rollover failed',
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to perform rollover' });
    } finally {
      setRollingOver(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pending Recovery & Arrears</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage monthly pending recovery and cumulative arrears</p>
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-amber-200/60 dark:border-amber-500/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Month Pending Recovery</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Unpaid invoices for {new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              Rs {(data?.pendingRecovery || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-orange-200/60 dark:border-orange-500/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Arrears</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Cumulative from all months</p>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-500/10">
                <ArrowRightLeft className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              Rs {(data?.totalArrears || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <button
          onClick={handleRollover}
          disabled={rollingOver || !data || data.pendingRecovery === 0}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 disabled:shadow-none transition-all duration-300"
        >
          {rollingOver ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <ArrowRightLeft className="w-5 h-5" />
          )}
          {rollingOver ? 'Rolling Over...' : 'Rollover Pending Recovery to Arrears'}
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
          <div className="flex items-center gap-2.5 p-5 border-b border-slate-200/60 dark:border-slate-700/60">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Arrears Rollover History</h3>
          </div>

          {!loading && data?.history && data.history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/60">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Period</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rolled Over</th>
                    <th className="text-right py-3 px-5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Arrears</th>
                    <th className="text-center py-3 px-5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((item, index) => (
                    <tr key={item.id} className={`border-b border-slate-100 dark:border-slate-700/50 ${index !== data.history.length - 1 ? '' : ''}`}>
                      <td className="py-3.5 px-5 text-sm font-medium text-slate-900 dark:text-white">
                        {monthNames[item.month - 1]} {item.year}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-right text-slate-600 dark:text-slate-300">
                        Rs {item.pendingRecoveryAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-right text-slate-600 dark:text-slate-300">
                        Rs {item.amountRolledOver.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-right font-semibold text-slate-900 dark:text-white">
                        Rs {item.cumulativeArrears.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          item.rolloverType === 'automatic'
                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
                        }`}>
                          {item.rolloverType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <History className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No arrears history yet</p>
              <p className="text-xs mt-1">Run a rollover to create the first record</p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}