'use client';

import { useRouter } from 'next/navigation';
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
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function ArrearsManagement() {
  const router = useRouter();
  const [data, setData] = useState<ArrearsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rollingOver, setRollingOver] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/arrears', {
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok) {
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
    if (!confirm('Are you sure you want to rollover pending recovery to arrears? This will move the current pending recovery amount to total arrears.')) {
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
      setMessage({
        type: 'error',
        text: 'Failed to perform rollover',
      });
    } finally {
      setRollingOver(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-linear-to-br from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 shadow-md">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Pending Recovery & Arrears</h2>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
            : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-amber-200/60 dark:border-amber-500/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Current Month Pending Recovery
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Unpaid amounts for current month
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold bg-linear-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
            Rs {(data?.pendingRecovery || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-orange-200/60 dark:border-orange-500/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Arrears
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Cumulative from all months
              </p>
            </div>
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10">
              <ArrowRightLeft className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold bg-linear-to-r from-orange-600 to-orange-500 dark:from-orange-400 dark:to-orange-300 bg-clip-text text-transparent">
            Rs {(data?.totalArrears || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <button
        onClick={handleRollover}
        disabled={rollingOver || (data?.pendingRecovery || 0) === 0}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl shadow-lg shadow-amber-500/20 disabled:shadow-none transition-all duration-300 disabled:cursor-not-allowed"
      >
        {rollingOver ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <ArrowRightLeft className="w-5 h-5" />
        )}
        {rollingOver ? 'Rolling Over...' : 'Rollover to Arrears'}
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Arrears History</h3>
        </div>

        {data?.history && data.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Period</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Pending</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Rolled Over</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Total Arrears</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-2 text-sm text-gray-900 dark:text-gray-100">
                      {monthNames[item.month - 1]} {item.year}
                    </td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900 dark:text-gray-100">
                      Rs {item.pendingRecoveryAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-sm text-right text-gray-900 dark:text-gray-100">
                      Rs {item.amountRolledOver.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      Rs {item.cumulativeArrears.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        item.rolloverType === 'automatic'
                          ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400'
                      }`}>
                        {item.rolloverType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No arrears history yet
          </p>
        )}
      </div>
    </div>
  );
}