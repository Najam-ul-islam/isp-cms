'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface FinancialSummaryProps {
  totalRevenue: number;
  totalExpenses: number;
  totalArrears: number;
  totalPayable: number;
  totalReceivable: number;
}

const formatCurrency = (value: number): string =>
  `Rs ${value.toLocaleString()}`;

export default function FinancialSummary({
  totalRevenue = 0,
  totalExpenses = 0,
  totalArrears = 0,
  totalPayable = 0,
  totalReceivable = 0,
}: FinancialSummaryProps) {
  const router = useRouter();

  const netProfit = useMemo(
    () => (totalRevenue ?? 0) - (totalExpenses ?? 0),
    [totalRevenue, totalExpenses]
  );
  const isProfit = netProfit >= 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-linear-to-br from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400 shadow-md">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Financial Summary</h2>
      </div>
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Total Revenue */}
          <button
            onClick={() => router.push('/dashboard/payments')}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-emerald-200/60 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            aria-label={`Total Revenue: ${formatCurrency(totalRevenue)}`}
            title="Paid clients margin + product sales profit (current month)"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Revenue
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Paid Clients Margin + Product Profit
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 transition-transform duration-200 group-hover:scale-110">
                <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold bg-linear-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
              {formatCurrency(totalRevenue)}
            </p>
          </button>

          {/* Card 2: Total Expenses */}
          <button
            onClick={() => router.push('/dashboard/expenses')}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-rose-200/60 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50/80 dark:hover:bg-rose-500/5 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            aria-label={`Total Expenses: ${formatCurrency(totalExpenses)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Expenses
                </p>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 transition-transform duration-200 group-hover:scale-110">
                <ArrowDownLeft className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold bg-linear-to-r from-rose-600 to-rose-500 dark:from-rose-400 dark:to-rose-300 bg-clip-text text-transparent">
              {formatCurrency(totalExpenses)}
            </p>
          </button>

          {/* Card 3: Net Profit — between Expenses and Arrears */}
          <div
            className={`group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border transition-all duration-300 ${
              isProfit
                ? 'border-teal-200/60 dark:border-teal-500/20 hover:border-teal-300 dark:hover:border-teal-500/40 hover:bg-teal-50/80 dark:hover:bg-teal-500/5 hover:shadow-lg hover:shadow-teal-500/10'
                : 'border-red-200/60 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40 hover:bg-red-50/80 dark:hover:bg-red-500/5 hover:shadow-lg hover:shadow-red-500/10'
            } hover:-translate-y-1`}
            aria-label={`Net Profit: ${formatCurrency(netProfit)}`}
            title="Revenue minus expenses"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Net Profit
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {isProfit ? 'Profit' : 'Loss'}
                </p>
              </div>
              <div className={`p-2 rounded-lg transition-transform duration-200 group-hover:scale-110 ${
                isProfit
                  ? 'bg-teal-50 dark:bg-teal-500/10'
                  : 'bg-red-50 dark:bg-red-500/10'
              }`}>
                {isProfit
                  ? <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  : <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                }
              </div>
            </div>
            <p className={`text-2xl font-semibold bg-clip-text text-transparent ${
              isProfit
                ? 'bg-linear-to-r from-teal-600 to-teal-500 dark:from-teal-400 dark:to-teal-300'
                : 'bg-linear-to-r from-red-600 to-red-500 dark:from-red-400 dark:to-red-300'
            }`}>
              {formatCurrency(netProfit)}
            </p>
          </div>

          {/* Card 4: Total Arrears */}
          <button
            onClick={() => router.push('/dashboard/payments?filter=due')}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-amber-200/60 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 hover:bg-amber-50/80 dark:hover:bg-amber-500/5 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            aria-label={`Total Arrears: ${formatCurrency(totalArrears)}`}
            title="Pending payments from clients who still owe you"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Arrears
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Clients owe you
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 transition-transform duration-200 group-hover:scale-110">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold bg-linear-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
              {formatCurrency(totalArrears)}
            </p>
          </button>

          {/* Card 5: Total Payable */}
          <button
            onClick={() => router.push('/dashboard/expenses')}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-orange-200/60 dark:border-orange-500/20 hover:border-orange-300 dark:hover:border-orange-500/40 hover:bg-orange-50/80 dark:hover:bg-orange-500/5 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            aria-label={`Total Payable: ${formatCurrency(totalPayable)}`}
            title="Total expenses and liabilities"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Payable
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Your expenses
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 transition-transform duration-200 group-hover:scale-110">
                <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold bg-linear-to-r from-orange-600 to-orange-500 dark:from-orange-400 dark:to-orange-300 bg-clip-text text-transparent">
              {formatCurrency(totalPayable)}
            </p>
          </button>

          {/* Card 6: Total Receivable */}
          <button
            onClick={() => router.push('/dashboard/payments?filter=receivable')}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left border border-indigo-200/60 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-500/5 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            aria-label={`Total Receivable: ${formatCurrency(totalReceivable)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Receivable
                </p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 transition-transform duration-200 group-hover:scale-110">
                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-semibold bg-linear-to-r from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent">
              {formatCurrency(totalReceivable)}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
