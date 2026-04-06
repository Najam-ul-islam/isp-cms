"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {plan ? "Edit Plan" : "Add Plan"}
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
              Plan Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Basic, Pro, Enterprise"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (PKR)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (Days)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Plan description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Features & Modules
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Billing</p>
                  <p className="text-xs text-gray-500">Enable billing module</p>
                </div>
                <input
                  type="checkbox"
                  checked={features.billing}
                  onChange={(e) => setFeatures({ ...features, billing: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Inventory</p>
                  <p className="text-xs text-gray-500">Enable inventory management</p>
                </div>
                <input
                  type="checkbox"
                  checked={features.inventory}
                  onChange={(e) => setFeatures({ ...features, inventory: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Employees</p>
                  <p className="text-xs text-gray-500">Enable employee management</p>
                </div>
                <input
                  type="checkbox"
                  checked={features.employees}
                  onChange={(e) => setFeatures({ ...features, employees: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>

              <div className="p-3 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Max Clients (-1 for unlimited)
                </label>
                <input
                  type="number"
                  value={features.maxClients}
                  onChange={(e) => setFeatures({ ...features, maxClients: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="-1"
                />
              </div>
            </div>
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
              disabled={loading || !name || !price || !duration}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
