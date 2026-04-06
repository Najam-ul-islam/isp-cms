"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Assign Plan to Company
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan
            </label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Plan</option>
              {plans
                .filter((p) => p.isActive)
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - PKR {plan.price.toLocaleString()} ({plan.duration}{" "}
                    days)
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !companyId || !planId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Assigning..." : "Assign Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
