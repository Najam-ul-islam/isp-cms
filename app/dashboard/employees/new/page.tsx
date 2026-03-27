"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, User, Shield, Mail, Phone, Save, ArrowLeft, Check, X } from "lucide-react";

interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  execute: boolean;
}

export default function NewEmployeePage() {
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

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
        }
      } else if (permissionType === 'execute') {
        newPermissions[moduleIndex].execute = !newPermissions[moduleIndex].execute;
        // If execute is enabled, automatically enable read and write
        if (newPermissions[moduleIndex].execute) {
          newPermissions[moduleIndex].read = true;
          newPermissions[moduleIndex].write = true;
        }
      }
      return newPermissions;
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

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

      const response = await fetch("/api/employees", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
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
        alert(errorData.error || "Failed to create employee");
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      alert("An error occurred while creating the employee");
    } finally {
      setLoading(false);
    }
  };

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
            Add New Employee
          </h1>
          <p className="text-slate-600">Create a new employee account with specific permissions</p>
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
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition ${
                  errors.name ? "border-red-500" : "border-slate-300"
                }`}
                placeholder="Enter full name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition ${
                  errors.email ? "border-red-500" : "border-slate-300"
                }`}
                placeholder="Enter email address"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
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
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition ${
                  errors.role ? "border-red-500" : "border-slate-300"
                }`}
              >
                <option value="">Select a role</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Administrator</option>
                <option value="SUPER_ADMIN">Super Administrator</option>
              </select>
              {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
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
                onChange={handleChange}
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
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Employee
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}