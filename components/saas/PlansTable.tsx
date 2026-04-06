"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
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
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">All Plans</h3>
        <button
          onClick={() => {
            setEditingPlan(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-lg border-2 p-6 ${
              plan.isActive ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                <p className="text-3xl font-bold mt-2 text-blue-600">
                  PKR {plan.price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {plan.duration} days
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  plan.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {plan.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {plan.description && (
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
            )}

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Features:</p>
              <div className="space-y-1">
                {Object.entries(plan.features).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {(value as boolean) ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-400" />
                    )}
                    <span className="text-gray-700 capitalize">{key}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setEditingPlan(plan);
                  setIsModalOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleToggleActive(plan.id, plan.isActive)}
                disabled={loading === plan.id}
                className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {plan.isActive ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
                disabled={loading === plan.id}
                className="px-3 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No plans created yet</p>
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
