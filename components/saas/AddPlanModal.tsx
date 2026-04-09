"use client";

import { useState, useEffect } from "react";
import { X, CreditCard } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
  features: any;
  isActive: boolean;
}

interface AddPlanModalProps {
  plan: Plan | null;
  onClose: () => void;
  onSave: (planData: any) => void;
}

export default function AddPlanModal({ plan, onClose, onSave }: AddPlanModalProps) {
  const [name, setName] = useState(plan?.name || "");
  const [price, setPrice] = useState(plan?.price?.toString() || "0");
  const [duration, setDuration] = useState(plan?.duration?.toString() || "30");
  const [description, setDescription] = useState(plan?.description || "");
  const [features, setFeatures] = useState({
    billing: plan?.features?.billing ?? true,
    inventory: plan?.features?.inventory ?? false,
    employees: plan?.features?.employees ?? false,
    maxClients: plan?.features?.maxClients ?? -1,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !duration) return;

    setLoading(true);
    try {
      await onSave({
        name,
        price: parseFloat(price),
        duration: parseInt(duration),
        description: description || undefined,
        features,
      });
    } catch (error) {
      console.error("Failed to save plan:", error);
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
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {plan ? "Edit Plan" : "Add Plan"}
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
            <label htmlFor="plan-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Plan Name
            </label>
            <input
              id="plan-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              placeholder="e.g., Basic, Pro, Enterprise"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-price" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Price (PKR)
              </label>
              <input
                id="plan-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 transition-all"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label htmlFor="plan-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Duration (Days)
              </label>
              <input
                id="plan-duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 transition-all"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="plan-description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Description
            </label>
            <textarea
              id="plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all resize-none"
              rows={2}
              placeholder="Plan description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
              Features & Modules
            </label>
            <div className="space-y-3">
              {[
                { key: "billing", label: "Billing", desc: "Enable billing module" },
                { key: "inventory", label: "Inventory", desc: "Enable inventory management" },
                { key: "employees", label: "Employees", desc: "Enable employee management" },
              ].map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{feature.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{feature.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={features[feature.key as keyof typeof features] as boolean}
                    onChange={(e) => setFeatures({ ...features, [feature.key]: e.target.checked })}
                    className="w-5 h-5 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500/20 focus:ring-2"
                  />
                </div>
              ))}

              <div className="p-3 border border-gray-200/60 dark:border-gray-700/60 rounded-xl">
                <label htmlFor="max-clients" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                  Max Clients (-1 for unlimited)
                </label>
                <input
                  id="max-clients"
                  type="number"
                  value={features.maxClients}
                  onChange={(e) => setFeatures({ ...features, maxClients: parseInt(e.target.value) || -1 })}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 transition-all"
                  min="-1"
                />
              </div>
            </div>
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
              disabled={loading || !name || !price || !duration}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : plan ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
