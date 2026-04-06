"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Key } from "lucide-react";
import AddAdminModal from "@/components/saas/AddAdminModal";
import ResetPasswordModal from "@/components/saas/ResetPasswordModal";

interface Company {
  id: string;
  name: string;
}

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface CompanyAdminsTableProps {
  company: Company;
  admins: Admin[];
}

export default function CompanyAdminsTable({
  company,
  admins: initialAdmins,
}: CompanyAdminsTableProps) {
  const router = useRouter();
  const [admins, setAdmins] = useState(initialAdmins);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;

    setLoading(id);
    try {
      const response = await fetch(`/api/saas/admins/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete admin:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleResetPassword = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsResetModalOpen(true);
  };

  const handlePasswordReset = async (newPassword: string) => {
    if (!selectedAdmin) return;

    try {
      const response = await fetch(`/api/saas/admins/${selectedAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetPassword",
          newPassword,
        }),
      });

      if (response.ok) {
        setIsResetModalOpen(false);
        setSelectedAdmin(null);
        alert("Password reset successfully");
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
    }
  };

  const handleAddAdmin = async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    companyId: string;
  }) => {
    try {
      const response = await fetch("/api/saas/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newAdmin = await response.json();
        setAdmins((prev) => [newAdmin, ...prev]);
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to add admin:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/saas/companies/${company.id}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Admins - {company.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage company administrators
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Company Admins
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Admin
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
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
              {admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {admin.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {admin.email}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        admin.role === "ADMIN"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleResetPassword(admin)}
                      className="text-yellow-600 hover:text-yellow-800 transition-colors"
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(admin.id)}
                      disabled={loading === admin.id}
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

          {admins.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No admins for this company</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <AddAdminModal
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddAdmin}
          preselectedCompanyId={company.id}
        />
      )}

      {isResetModalOpen && selectedAdmin && (
        <ResetPasswordModal
          adminName={selectedAdmin.name}
          onClose={() => {
            setIsResetModalOpen(false);
            setSelectedAdmin(null);
          }}
          onReset={handlePasswordReset}
        />
      )}
    </div>
  );
}
