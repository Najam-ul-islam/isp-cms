"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, Power, Building2 } from "lucide-react";
import AddCompanyModal from "@/components/saas/AddCompanyModal";

interface Company {
  id: string;
  name: string;
  isActive: boolean;
  modulesEnabled: any;
  createdAt: Date;
  totalClients: number;
  totalRevenue: number;
}

interface CompaniesTableProps {
  companies: Company[];
}

export default function CompaniesTable({
  companies: initialCompanies = [],
}: CompaniesTableProps) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (id: string) => {
    setLoading(id);
    try {
      const response = await fetch(`/api/saas/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "toggleStatus" }),
      });

      if (response.ok) {
        const updated = await response.json();
        setCompanies((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: updated.isActive } : c))
        );
        showNotification("success", `Company ${updated.isActive ? "activated" : "suspended"} successfully`);
      } else {
        const data = await response.json();
        showNotification("error", data.error || "Failed to update company");
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
      showNotification("error", "Failed to update company");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const company = companies.find((c) => c.id === id);
    if (!confirm(`Are you sure you want to permanently delete "${company?.name}"? This action cannot be undone.`)) return;

    setLoading(id);
    try {
      const response = await fetch(`/api/saas/companies/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== id));
        showNotification("success", "Company deleted successfully");
      } else {
        const data = await response.json();
        showNotification("error", data.error || "Failed to delete company");
      }
    } catch (error) {
      console.error("Failed to delete company:", error);
      showNotification("error", "Failed to delete company");
    } finally {
      setLoading(null);
    }
  };

  const handleAddCompany = async (name: string) => {
    try {
      const response = await fetch("/api/saas/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const newCompany = await response.json();
        setCompanies((prev) => [
          {
            ...newCompany,
            totalClients: 0,
            totalRevenue: 0,
          },
          ...prev,
        ]);
        setIsModalOpen(false);
        showNotification("success", "Company added successfully");
      } else {
        const data = await response.json();
        showNotification("error", data.error || "Failed to add company");
      }
    } catch (error) {
      console.error("Failed to add company:", error);
      showNotification("error", "Failed to add company");
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border animate-in slide-in-from-top-2 duration-300 ${
          notification.type === "success"
            ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50"
            : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              notification.type === "success"
                ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
            }`}>
              {notification.type === "success" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className={`text-sm font-medium ${
              notification.type === "success"
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200"
            }`}>
              {notification.message}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200/60 dark:border-gray-700/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                All Companies
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filteredCompanies.length} of {companies.length} companies
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            aria-label="Search companies"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-750 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Status
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Clients
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Revenue
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Created
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {filteredCompanies.map((company) => (
              <tr
                key={company.id}
                className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors duration-150"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <button
                      onClick={() => router.push(`/saas/companies/${company.id}`)}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-left transition-colors"
                    >
                      {company.name}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      company.isActive
                        ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {company.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {company.totalClients}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                  PKR {company.totalRevenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(company.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/saas/companies/${company.id}`)}
                      className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                      title="Edit"
                      aria-label={`Edit ${company.name}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(company.id)}
                      disabled={loading === company.id}
                      className="p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={company.isActive ? "Suspend" : "Activate"}
                      aria-label={`${company.isActive ? "Suspend" : "Activate"} ${company.name}`}
                    >
                      {loading === company.id ? (
                        <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(company.id)}
                      disabled={loading === company.id}
                      className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                      aria-label={`Delete ${company.name}`}
                    >
                      {loading === company.id ? (
                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCompanies.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">
              {searchTerm ? "No companies match your search" : "No companies found"}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {searchTerm ? "Try adjusting your search terms" : "Click 'Add Company' to get started"}
            </p>
          </div>
        ) : null}
      </div>
    </div>

      {/* Add Company Modal */}
      {isModalOpen && (
        <AddCompanyModal
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddCompany}
        />
      )}
    </div>
  );
}
