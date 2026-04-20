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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Inventory Management</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Manage your inventory items and track stock levels
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/inventory/new")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 dark:focus:ring-offset-gray-900"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Total Items</p>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{items.length}</div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">Items in inventory</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Low Stock</p>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lowStockItems.length}</div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">Items need reorder</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Total Value</p>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            Rs {items.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">Inventory worth</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search inventory items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm dark:text-white dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-slate-200/60 dark:border-gray-700">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/60 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800 dark:text-white">All Inventory Items</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  {filteredItems.length} items found
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-gray-900/50 dark:to-gray-800/30">
                <tr className="text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Item</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Quantity</th>
                  <th className="px-6 py-3.5">Unit Price</th>
                  <th className="px-6 py-3.5">Total Value</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-slate-200/60 dark:divide-gray-700">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent transition-all duration-200">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-white">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-gray-300">{item.category}</td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${
                          item.quantity < 10 ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-white"
                        }`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-gray-300">Rs {item.unitPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">Rs {item.totalValue.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {item.quantity < 10 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            <TrendingUp className="w-3 h-3" />
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/inventory/${item.id}/edit`)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
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
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-gray-500">
                        <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200/70 dark:from-gray-700 dark:to-gray-600/50 rounded-2xl">
                          <Package className="w-10 h-10 opacity-50" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-600 dark:text-gray-300">No inventory items found</p>
                          <p className="text-sm mt-1 text-slate-500 dark:text-gray-400">
                            {searchTerm ? "Try adjusting your search" : "Add your first inventory item"}
                          </p>
                        </div>
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