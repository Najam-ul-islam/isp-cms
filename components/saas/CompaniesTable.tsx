"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, Power } from "lucide-react";
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
  companies: initialCompanies,
}: CompaniesTableProps) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (id: string) => {
    setLoading(id);
    try {
      const response = await fetch(`/api/saas/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleStatus" }),
      });

      if (response.ok) {
        const updated = await response.json();
        setCompanies((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: updated.isActive } : c))
        );
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to soft delete this company?")) return;

    setLoading(id);
    try {
      const response = await fetch(`/api/saas/companies/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete company:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleAddCompany = async (name: string) => {
    try {
      const response = await fetch("/api/saas/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      }
    } catch (error) {
      console.error("Failed to add company:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            All Companies
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCompanies.map((company) => (
              <tr
                key={company.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {company.name}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      company.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {company.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {company.totalClients}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  PKR {company.totalRevenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(company.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => router.push(`/saas/companies/${company.id}`)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(company.id)}
                    disabled={loading === company.id}
                    className="text-yellow-600 hover:text-yellow-800 transition-colors disabled:opacity-50"
                    title={company.isActive ? "Suspend" : "Activate"}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(company.id)}
                    disabled={loading === company.id}
                    className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No companies found</p>
          </div>
        )}
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
