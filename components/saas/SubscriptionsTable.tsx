"use client";

import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
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
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-orange-100 text-orange-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const daysRemaining = (endDate: Date) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Company Subscriptions
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Assign Plan
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days Left
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {sub.company.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div>
                    <p className="font-medium text-gray-900">{sub.plan.name}</p>
                    <p className="text-xs text-gray-500">
                      PKR {sub.plan.price.toLocaleString()} / {sub.plan.duration} days
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      sub.status
                    )}`}
                  >
                    {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(sub.startDate)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(sub.endDate)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {sub.status === "active" ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span
                        className={
                          daysRemaining(sub.endDate) < 7
                            ? "text-orange-600 font-semibold"
                            : "text-gray-600"
                        }
                      >
                        {daysRemaining(sub.endDate)} days
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {subscriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No subscriptions yet</p>
          </div>
        )}
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
