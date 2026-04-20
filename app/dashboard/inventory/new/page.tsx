"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

export default function AddInventoryItem() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "0",
    unit: "piece",
    unitPrice: "0",
  });

  // Auto-detect unit based on product name
  const detectUnit = (productName: string): string => {
    const name = productName.toLowerCase();
    if (name.includes("cable") || name.includes("wire") || name.includes("cord")) {
      return "meter";
    }
    if (name.includes("roll")) {
      return "roll";
    }
    if (name.includes("kg") || name.includes("kilogram")) {
      return "kg";
    }
    if (name.includes("box")) {
      return "box";
    }
    if (name.includes("pack")) {
      return "pack";
    }
    return "piece";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Auto-detect unit when name changes
    if (name === "name") {
      const detectedUnit = detectUnit(value);
      setFormData((prev) => ({ ...prev, unit: detectedUnit }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit,
          unitPrice: parseFloat(formData.unitPrice),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create item");
      }

      router.push("/dashboard/inventory");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/inventory"
              className="p-2 text-slate-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span>Add Inventory Item</span>
              </h1>
              <p className="text-slate-500 dark:text-gray-400 mt-1">Add a new item to your inventory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Item Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white dark:placeholder-gray-500"
              placeholder="e.g., Router, Cable, Connector"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white dark:placeholder-gray-500"
              placeholder="e.g., Hardware, Cable, Accessories"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Unit
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white appearance-none cursor-pointer"
              >
                <option value="piece">Piece</option>
                <option value="meter">Meter</option>
                <option value="feet">Feet</option>
                <option value="roll">Roll</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="set">Set</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Auto-detected from product name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Unit Price (PKR per {formData.unit})
              </label>
              <input
                type="number"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl border border-blue-200/60 dark:border-blue-700/50">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
              Total Value Preview
            </h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              PKR{" "}
              {(
                parseFloat(formData.quantity) * parseFloat(formData.unitPrice)
              ).toLocaleString()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/60 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Plus className="w-4 h-4" />
              {loading ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
