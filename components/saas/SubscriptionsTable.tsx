"use client";

import { useState } from "react";
import { Plus, Calendar, DollarSign } from "lucide-react";
import AssignPlanModal from "@/components/saas/AssignPlanModal";

interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  company: { name: string };
  plan: { name: string; price: number; duration: number };
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface SubscriptionsTableProps {
  subscriptions: Subscription[];
  plans: Plan[];
}

export default function SubscriptionsTable({
  subscriptions: initialSubscriptions,
  plans,
}: SubscriptionsTableProps) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
      case "expired":
        return "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400";
      case "cancelled":
        return "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const daysRemaining = (endDate: Date) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Stats
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === "active").length,
    expired: subscriptions.filter((s) => s.status === "expired").length,
    cancelled: subscriptions.filter((s) => s.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-50">
            {stats.total}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 p-5">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200/60 dark:border-amber-500/20 p-5">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Expired</p>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {stats.expired}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200/60 dark:border-red-500/20 p-5">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Cancelled</p>
          <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
            {stats.cancelled}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                  Company Subscriptions
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage active and past subscriptions
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Assign Plan
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-750 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Company
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Plan
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Start Date
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  End Date
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Days Left
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {sub.company.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {sub.company.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sub.plan.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PKR {sub.plan.price.toLocaleString()} / {sub.plan.duration} days
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        sub.status
                      )}`}
                    >
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(sub.startDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(sub.endDate)}
                  </td>
                  <td className="px-6 py-4">
                    {sub.status === "active" ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span
                          className={`text-sm font-medium ${
                            daysRemaining(sub.endDate) < 7
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {daysRemaining(sub.endDate)} days
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {subscriptions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No subscriptions yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Assign a plan to a company to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Plan Modal */}
      {isModalOpen && (
        <AssignPlanModal
          plans={plans}
          onClose={() => setIsModalOpen(false)}
          onAssign={async (data) => {
            try {
              const response = await fetch("/api/saas/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });

              if (response.ok) {
                window.location.reload();
              }
            } catch (error) {
              console.error("Failed to assign plan:", error);
            }
          }}
        />
      )}
    </div>
  );
}
