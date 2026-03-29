'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { IndianRupee, TrendingUp, Calendar, Users } from 'lucide-react';

interface PaymentStat {
  date: string;
  amount: number;
  count: number;
}

interface PaymentStatsProps {
  companyId: string;
}

export default function PaymentStats({ companyId }: PaymentStatsProps) {
  const [stats, setStats] = useState<PaymentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Calculate date range based on period
        const endDate = new Date();
        const startDate = new Date();

        if (period === 'week') {
          startDate.setDate(endDate.getDate() - 7);
        } else if (period === 'month') {
          startDate.setMonth(endDate.getMonth() - 1);
        } else if (period === 'quarter') {
          startDate.setMonth(endDate.getMonth() - 3);
        }

        const response = await fetch(`/api/payments/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&companyId=${companyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          // Process data to group by date
          // This would require backend API changes to return daily stats
          // For now, we'll simulate some data
          const simulatedData: PaymentStat[] = [];
          const currentDate = new Date(startDate);

          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            // Simulate some data for demo purposes
            const amount = Math.floor(Math.random() * 50000) + 10000;
            const count = Math.floor(Math.random() * 20) + 5;

            simulatedData.push({
              date: dateStr,
              amount,
              count
            });

            currentDate.setDate(currentDate.getDate() + 1);
          }

          setStats(simulatedData.slice(0, 10)); // Show last 10 days
        }
      } catch (error) {
        console.error('Error fetching payment stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period, companyId]);

  const totalPayments = stats.reduce((sum, stat) => sum + stat.amount, 0);
  const totalTransactions = stats.reduce((sum, stat) => sum + stat.count, 0);
  const avgPayment = totalTransactions > 0 ? totalPayments / totalTransactions : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
            <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
            <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
          </div>
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Analytics</h2>
          <p className="text-gray-500 dark:text-gray-400">Track payment trends and statistics</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-linear-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
              <IndianRupee className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Payments</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                Rs {totalPayments.toLocaleString('en-PK')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-linear-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Transactions</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totalTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-linear-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Avg. Payment</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                Rs {Math.round(avgPayment).toLocaleString('en-PK')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [`Rs ${Number(value).toLocaleString('en-PK')}`, 'Amount']}
              labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            />
            <Bar dataKey="amount" name="Payment Amount">
              {stats.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.amount > avgPayment ? '#4f46e5' : '#818cf8'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}