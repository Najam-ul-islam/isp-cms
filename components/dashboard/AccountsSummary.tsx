'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { getAccountSummary } from '@/modules/accounts/services';

interface AccountSummaryData {
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
}

export default function AccountsSummary() {
  const [summary, setSummary] = useState<AccountSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const admin = JSON.parse(localStorage.getItem('admin') || '{}');
        const data = await getAccountSummary(admin.companyId);
        setSummary(data);
      } catch (error) {
        console.error('Error fetching account summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    // Refresh every 30 seconds
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 animate-pulse">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Accounts Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 bg-slate-100 rounded-lg">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Accounts Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Receivable</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            Rs {summary?.totalReceivable.toLocaleString('en-PK') || '0'}
          </p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Payable</span>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">
            Rs {summary?.totalPayable.toLocaleString('en-PK') || '0'}
          </p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Net Balance</span>
          </div>
          <p className={`text-2xl font-bold mt-2 ${
            (summary?.netBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            Rs {(summary?.netBalance || 0).toLocaleString('en-PK')}
          </p>
        </div>
      </div>
    </div>
  );
}