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
    unitPrice: "0",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/inventory"
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </Link>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          Add Inventory Item
        </h1>
        <p className="text-slate-600 mt-2">Add a new item to your inventory</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Item Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Router, Cable, Connector"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Hardware, Cable, Accessories"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Unit Price (PKR)
              </label>
              <input
                type="number"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-2">
              Total Value Preview
            </h3>
            <p className="text-2xl font-bold text-slate-800">
              PKR{" "}
              {(
                parseFloat(formData.quantity) * parseFloat(formData.unitPrice)
              ).toLocaleString()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
