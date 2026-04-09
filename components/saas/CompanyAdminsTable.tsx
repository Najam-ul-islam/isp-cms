"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Key, Users } from "lucide-react";
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/saas/companies/${company.id}`)}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
            Admins - {company.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage company administrators
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                  Company Admins
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {admins.length} admin{admins.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Admin
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-750 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Email
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Role
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
              {admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors duration-150"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {admin.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {admin.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        admin.role === "ADMIN"
                          ? "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(admin.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleResetPassword(admin)}
                        className="p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                        title="Reset Password"
                        aria-label={`Reset password for ${admin.name}`}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id)}
                        disabled={loading === admin.id}
                        className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                        aria-label={`Delete ${admin.name}`}
                      >
                        {loading === admin.id ? (
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

          {admins.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No admins for this company</p>
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
