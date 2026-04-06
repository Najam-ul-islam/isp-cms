"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Users } from "lucide-react";

interface CompanyDetailProps {
  company: {
    id: string;
    name: string;
    isActive: boolean;
    modulesEnabled: any;
    createdAt: Date;
    totalClients: number;
    totalRevenue: number;
  };
}

const AVAILABLE_MODULES = [
  { key: "billing", label: "Billing & Invoicing" },
  { key: "inventory", label: "Inventory Management" },
  { key: "employees", label: "Employee Management" },
];

export default function CompanyDetail({ company }: CompanyDetailProps) {
  const router = useRouter();
  const [name, setName] = useState(company.name);
  const [modulesEnabled, setModulesEnabled] = useState(
    company.modulesEnabled || {}
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/saas/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, modulesEnabled }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Company updated successfully" });
      } else {
        setMessage({ type: "error", text: "Failed to update company" });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (key: string) => {
    setModulesEnabled((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/saas/companies")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Company Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              View and manage company settings
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/saas/companies/${company.id}/admins`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          Manage Admins
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Company Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Basic Information
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p
              className={`text-sm font-medium mt-1 ${
                company.isActive ? "text-green-600" : "text-red-600"
              }`}
            >
              {company.isActive ? "Active" : "Suspended"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {new Date(company.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {company.totalClients}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              PKR {company.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Module Access Control */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Module Access Control
          </h3>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>

        <div className="space-y-3">
          {AVAILABLE_MODULES.map((module) => (
            <div
              key={module.key}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {module.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {modulesEnabled[module.key] ? "Enabled" : "Disabled"}
                </p>
              </div>
              <button
                onClick={() => toggleModule(module.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  modulesEnabled[module.key]
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    modulesEnabled[module.key]
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
