"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Key, Users } from "lucide-react";
import AddAdminModal from "@/components/saas/AddAdminModal";
import ResetPasswordModal from "@/components/saas/ResetPasswordModal";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string;
  createdAt: Date;
}

interface AdminsTableProps {
  admins: Admin[];
}

export default function AdminsTable({ admins: initialAdmins = [] }: AdminsTableProps) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    const admin = admins.find((a) => a.id === id);
    if (!confirm(`Are you sure you want to permanently delete "${admin?.name}"? This action cannot be undone.`)) return;

    setLoading(id);
    try {
      const response = await fetch(`/api/saas/admins/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
        showNotification("success", "Admin deleted successfully");
      } else {
        const data = await response.json();
        showNotification("error", data.error || "Failed to delete admin");
      }
    } catch (error) {
      console.error("Failed to delete admin:", error);
      showNotification("error", "Failed to delete admin");
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
        credentials: "include",
        body: JSON.stringify({
          action: "resetPassword",
          newPassword,
        }),
      });

      if (response.ok) {
        setIsResetModalOpen(false);
        setSelectedAdmin(null);
        showNotification("success", "Password reset successfully");
      } else {
        const data = await response.json();
        showNotification("error", data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
      showNotification("error", "Failed to reset password");
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
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newAdmin = await response.json();
        setAdmins((prev) => [
          {
            ...newAdmin,
            companyName: newAdmin.company.name,
          },
          ...prev,
        ]);
        setIsModalOpen(false);
        showNotification("success", "Admin added successfully");
      } else {
        const data = await response.json();
        showNotification("error", data.error || "Failed to add admin");
      }
    } catch (error) {
      console.error("Failed to add admin:", error);
      showNotification("error", "Failed to add admin");
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
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                All Admins
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filteredAdmins.length} of {admins.length} admins
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Admin
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search admins by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            aria-label="Search admins"
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
                Email
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Role
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Company
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
            {filteredAdmins.map((admin) => (
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
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {admin.companyName}
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

        {filteredAdmins.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">
              {searchTerm ? "No admins match your search" : "No admins found"}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {searchTerm ? "Try adjusting your search terms" : "Click 'Add Admin' to get started"}
            </p>
          </div>
        ) : null}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <AddAdminModal
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddAdmin}
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
    </div>
  );
}
