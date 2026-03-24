'use client';

import { useRouter } from 'next/navigation';
import {
  Plus,
  CreditCard,
  Receipt,
  TrendingUp,
  Wallet,
  DollarSign,
  ShoppingCart,
  PiggyBank
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}

export default function QuickActions() {
  const router = useRouter();

  const quickActions: QuickAction[] = [
    {
      title: "Add Client",
      description: "Register new client",
      icon: Plus,
      color: "bg-blue-500",
      onClick: () => router.push('/dashboard/clients/new')
    },
    {
      title: "Add Payment",
      description: "Record client payment",
      icon: CreditCard,
      color: "bg-green-500",
      onClick: () => router.push('/dashboard/payments')
    },
    {
      title: "Add Expense",
      description: "Record business expense",
      icon: Receipt,
      color: "bg-red-500",
      onClick: () => router.push('/dashboard/expenses')
    },
    {
      title: "View Reports",
      description: "Financial reports & analytics",
      icon: Wallet,
      color: "bg-purple-500",
      onClick: () => router.push('/dashboard/reports')
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
          >
            <div className={`${action.color} p-3 rounded-lg text-white mb-2 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-slate-700 text-sm text-center">{action.title}</span>
            <span className="text-slate-500 text-xs text-center">{action.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}