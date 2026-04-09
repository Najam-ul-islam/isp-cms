"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle, CreditCard } from "lucide-react";
import AddPlanModal from "@/components/saas/AddPlanModal";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
  features: any;
  isActive: boolean;
  createdAt: Date;
}

interface PlansTableProps {
  plans: Plan[];
}

export default function PlansTable({ plans: initialPlans }: PlansTableProps) {
  const [plans, setPlans] = useState(initialPlans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this plan?")) return;

    setLoading(id);
    try {
      const response = await fetch(`/api/saas/plans/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setLoading(id);
    try {
      const response = await fetch(`/api/saas/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, isActive: !p.isActive } : p
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle plan status:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleSavePlan = async (planData: any) => {
    try {
      const url = editingPlan
        ? `/api/saas/plans/${editingPlan.id}`
        : "/api/saas/plans";

      const method = editingPlan ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });

      if (response.ok) {
        const savedPlan = await response.json();

        if (editingPlan) {
          setPlans((prev) =>
            prev.map((p) => (p.id === editingPlan.id ? { ...p, ...savedPlan } : p))
          );
        } else {
          setPlans((prev) => [savedPlan, ...prev]);
        }

        setIsModalOpen(false);
        setEditingPlan(null);
      }
    } catch (error) {
      console.error("Failed to save plan:", error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Subscription Plans
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {plans.length} plan{plans.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm text-center py-12">
          <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No plans created yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create your first plan to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`group rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                plan.isActive
                  ? "border-blue-200/60 dark:border-blue-500/20 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-500/40"
                  : "border-gray-200/60 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/50 opacity-75"
              }`}
            >
              {/* Plan Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-50">{plan.name}</h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.isActive
                          ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    PKR {plan.price.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {plan.duration} days
                  </p>
                </div>
              </div>

              {/* Description */}
              {plan.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{plan.description}</p>
              )}

              {/* Features */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Features</p>
                <div className="space-y-1.5">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      {(value as boolean) ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      )}
                      <span className="text-gray-600 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                <button
                  onClick={() => {
                    setEditingPlan(plan);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(plan.id, plan.isActive)}
                  disabled={loading === plan.id}
                  className="p-2 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={plan.isActive ? "Deactivate plan" : "Activate plan"}
                >
                  {loading === plan.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : plan.isActive ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  disabled={loading === plan.id}
                  className="p-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Delete plan"
                >
                  {loading === plan.id ? (
                    <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Plan Modal */}
      {isModalOpen && (
        <AddPlanModal
          plan={editingPlan}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPlan(null);
          }}
          onSave={handleSavePlan}
        />
      )}
    </div>
  );
}
