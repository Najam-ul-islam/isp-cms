"use client";

import { useState, useEffect } from "react";
import { X, DollarSign } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive?: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface AssignPlanModalProps {
  plans: Plan[];
  onClose: () => void;
  onAssign: (data: { companyId: string; planId: string }) => void;
}

export default function AssignPlanModal({
  plans,
  onClose,
  onAssign,
}: AssignPlanModalProps) {
  const [companyId, setCompanyId] = useState("");
  const [planId, setPlanId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/saas/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(data))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !planId) return;

    setLoading(true);
    try {
      await onAssign({ companyId, planId });
    } catch (error) {
      console.error("Failed to assign plan:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Assign Plan to Company
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="assign-company" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Company
            </label>
            <select
              id="assign-company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 transition-all"
              required
              autoFocus
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="assign-plan" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Plan
            </label>
            <select
              id="assign-plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 transition-all"
              required
            >
              <option value="">Select Plan</option>
              {plans
                .filter((p) => p.isActive)
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - PKR {plan.price.toLocaleString()} ({plan.duration} days)
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !companyId || !planId}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Assigning...
                </span>
              ) : (
                "Assign Plan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
