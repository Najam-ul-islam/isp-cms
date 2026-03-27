"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Users, User, Shield, Mail, Phone, Save, ArrowLeft, Check, X } from "lucide-react";

interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  execute: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  permissions?: any;
  salary?: number;
  createdAt: string;
}

export default function EditEmployeePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "EMPLOYEE",
    salary: "",
  });

  const [permissions, setPermissions] = useState<Permission[]>([
    { module: "Dashboard", read: true, write: false, execute: false },
    { module: "Clients", read: false, write: false, execute: false },
    { module: "Packages", read: false, write: false, execute: false },
    { module: "Payments", read: false, write: false, execute: false },
    { module: "Expenses", read: false, write: false, execute: false },
    { module: "Reports", read: false, write: false, execute: false },
    { module: "Inventory", read: false, write: false, execute: false },
    { module: "Employees", read: false, write: false, execute: false },
    { module: "Settings", read: false, write: false, execute: false },
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = localStorage.getItem("token");

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`/api/employees/${params.id}`, {
          headers,
          credentials: "include",
        });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (response.ok) {
          const data: Employee = await response.json();

          setFormData({
            name: data.name,
            email: data.email,
            phone: data.phone || "",
            role: data.role,
            salary: data.salary ? data.salary.toString() : "",
          });

          // Load permissions if available
          if (data.permissions) {
            const loadedPermissions = [...permissions];
            Object.entries(data.permissions).forEach(([module, perms]: [string, any]) => {
              const index = loadedPermissions.findIndex(p => p.module.toLowerCase() === module);
              if (index !== -1) {
                loadedPermissions[index] = {
                  ...loadedPermissions[index],
                  read: perms.read || false,
                  write: perms.write || false,
                  execute: perms.execute || false,
                };
              }
            });
            setPermissions(loadedPermissions);
          }
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchEmployee();
    }
  }, [params.id, router]);

  const togglePermission = (moduleIndex: number, permissionType: keyof Permission) => {
    if (permissionType === 'module') return; // module name shouldn't be toggled

    setPermissions(prev => {
      const newPermissions = [...prev];
      if (permissionType === 'read') {
        newPermissions[moduleIndex].read = !newPermissions[moduleIndex].read;
      } else if (permissionType === 'write') {
        newPermissions[moduleIndex].write = !newPermissions[moduleIndex].write;
        // If write is enabled, automatically enable read
        if (newPermissions[moduleIndex].write) {
          newPermissions[moduleIndex].read = true;
        } else if (!newPermissions[moduleIndex].execute) {
          // If write is disabled and execute is also disabled, disable read
          newPermissions[moduleIndex].read = false;
        }
      } else if (permissionType === 'execute') {
        newPermissions[moduleIndex].execute = !newPermissions[moduleIndex].execute;
        // If execute is enabled, automatically enable read and write
        if (newPermissions[moduleIndex].execute) {
          newPermissions[moduleIndex].read = true;
          newPermissions[moduleIndex].write = true;
        } else if (!newPermissions[moduleIndex].write) {
          // If execute is disabled and write is also disabled, disable read
          newPermissions[moduleIndex].read = false;
        }
      }
      return newPermissions;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Prepare permissions data
      const permissionsData: Record<string, any> = {};
      permissions.forEach(permission => {
        permissionsData[permission.module.toLowerCase()] = {
          read: permission.read,
          write: permission.write,
          execute: permission.execute,
        };
      });

      const response = await fetch(`/api/employees`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          id: params.id,
          ...formData,
          salary: formData.salary ? parseFloat(formData.salary) : undefined,
          permissions: permissionsData,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.ok) {
        router.push("/dashboard/employees");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update employee");
      }
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("An error occurred while updating the employee");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse flex flex-col space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-4 bg-slate-200 rounded w-96"></div>
          <div className="space-y-4">
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            Edit Employee
          </h1>
          <p className="text-slate-600">Update employee information and permissions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({...prev, role: e.target.value}))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Administrator</option>
                <option value="SUPER_ADMIN">Super Administrator</option>
              </select>
            </div>

            <div>
              <label htmlFor="salary" className="block text-sm font-medium text-slate-700 mb-2">
                Salary
              </label>
              <input
                type="number"
                id="salary"
                name="salary"
                value={formData.salary}
                onChange={(e) => setFormData(prev => ({...prev, salary: e.target.value}))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="Enter salary amount"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Permissions
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Read</span>
              <span>Write</span>
              <span>Execute</span>
            </div>
          </div>

          <div className="space-y-3">
            {permissions.map((permission, index) => (
              <div key={permission.module} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                <span className="font-medium text-slate-700">{permission.module}</span>

                <div className="flex items-center gap-4">
                  {/* Read */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permission.read}
                      onChange={() => togglePermission(index, 'read')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      permission.read
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300"
                    }`}>
                      {permission.read && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">Read</span>
                  </label>

                  {/* Write */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permission.write}
                      onChange={() => togglePermission(index, 'write')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      permission.write
                        ? "bg-blue-500 border-blue-500"
                        : "border-slate-300"
                    }`}>
                      {permission.write && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">Write</span>
                  </label>

                  {/* Execute */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permission.execute}
                      onChange={() => togglePermission(index, 'execute')}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      permission.execute
                        ? "bg-purple-500 border-purple-500"
                        : "border-slate-300"
                    }`}>
                      {permission.execute && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">Execute</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600">
              <strong>Note:</strong> Write permission automatically grants Read, and Execute grants both Read and Write.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Update Employee
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}