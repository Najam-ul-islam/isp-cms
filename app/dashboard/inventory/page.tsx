"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, Plus, Search, Edit, Trash2, Eye, TrendingDown, TrendingUp } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  createdAt: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        // Check if user is authenticated by making a simple API call
        const authCheck = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include' // This ensures cookies are sent with the request
        });

        if (authCheck.status === 401) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/inventory?search=${searchTerm}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setItems(data);
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [searchTerm, router]);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = items.filter(item => item.quantity < 10);

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete item");
      }

      // Remove item from local state
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              Inventory Management
            </h1>
            <p className="text-slate-600 mt-2">
              Manage your inventory items and track stock levels
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/inventory/new")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Items</p>
              <p className="text-3xl font-bold text-slate-800">{items.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Low Stock</p>
              <p className="text-3xl font-bold text-amber-600">{lowStockItems.length}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Value</p>
              <p className="text-3xl font-bold text-slate-800">
                Rs {items.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search inventory items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Item</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Quantity</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Unit Price</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Total Value</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{item.category}</td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${
                          item.quantity < 10 ? "text-amber-600" : "text-slate-800"
                        }`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">Rs {item.unitPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium">Rs {item.totalValue.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {item.quantity < 10 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <TrendingUp className="w-3 h-3" />
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/inventory/${item.id}/edit`)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Package className="w-12 h-12 opacity-50" />
                        <p className="font-medium">No inventory items found</p>
                        <p className="text-sm">
                          {searchTerm ? "Try adjusting your search" : "Add your first inventory item"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}