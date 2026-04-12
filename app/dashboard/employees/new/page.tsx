"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, User, Shield, Mail, Phone, Save, ArrowLeft, Check, X, DollarSign } from "lucide-react";

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
      // Check if user is authenticated by making a simple API call
      const authCheck = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include' // This ensures cookies are sent with the request
      });

      if (authCheck.status === 401) {
        router.push('/login');
        return;
      }

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
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 rounded-2xl p-6 border border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 ease-out
                       border border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/60 dark:hover:border-gray-600/60
                       focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
              <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                Add New Employee
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Create a new employee account with specific permissions
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-6
                        transition-all duration-300 ease-out">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-5 flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-700/60">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl
                             border transition-all duration-200 ease-out
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500
                             ${errors.name
                               ? 'border-rose-300/60 dark:border-rose-600/60'
                               : 'border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/60 dark:hover:border-gray-600/60'
                             }`}
                  placeholder="Enter full name"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
              </div>
              {errors.name && (
                <p id="name-error" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1" role="alert">
                  <X className="w-3.5 h-3.5" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl
                             border transition-all duration-200 ease-out
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500
                             ${errors.email
                               ? 'border-rose-300/60 dark:border-rose-600/60'
                               : 'border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/60 dark:hover:border-gray-600/60'
                             }`}
                  placeholder="Enter email address"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1" role="alert">
                  <X className="w-3.5 h-3.5" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900
                             border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             hover:border-gray-300/60 dark:hover:border-gray-600/60
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500
                             transition-all duration-200 ease-out"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl
                             border transition-all duration-200 ease-out appearance-none cursor-pointer
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             text-gray-900 dark:text-gray-50
                             ${errors.role
                               ? 'border-rose-300/60 dark:border-rose-600/60'
                               : 'border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/60 dark:hover:border-gray-600/60'
                             }`}
                  aria-invalid={!!errors.role}
                  aria-describedby={errors.role ? "role-error" : undefined}
                >
                  <option value="">Select a role</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {errors.role && (
                <p id="role-error" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1" role="alert">
                  <X className="w-3.5 h-3.5" />
                  {errors.role}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="salary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Salary
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="number"
                  id="salary"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900
                             border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             hover:border-gray-300/60 dark:hover:border-gray-600/60
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500
                             transition-all duration-200 ease-out"
                  placeholder="Enter salary amount"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-6
                        transition-all duration-300 ease-out">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Shield className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              Permissions
            </h2>
            <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">Read</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">Write</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">Execute</span>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2 p-2 space-y-2">
            {permissions.map((permission, index) => (
              <div key={permission.module}
                   className="flex items-center justify-between p-3.5
                              border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                              hover:bg-gray-50/80 dark:hover:bg-gray-700/30
                              transition-all duration-200 ease-out">
                <span className="font-medium text-gray-700 dark:text-gray-300">{permission.module}</span>

                <div className="flex items-center gap-4">
                  {/* Read */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={permission.read}
                      onChange={() => togglePermission(index, 'read')}
                      className="sr-only"
                      aria-label={`Read access for ${permission.module}`}
                    />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                                   transition-all duration-200 ease-out group-hover:shadow-sm
                                   ${permission.read
                                     ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/20"
                                     : "border-gray-300/60 dark:border-gray-600/60 group-hover:border-gray-400/60 dark:group-hover:border-gray-500/60"
                                   }`}>
                      {permission.read && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors duration-200">Read</span>
                  </label>

                  {/* Write */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={permission.write}
                      onChange={() => togglePermission(index, 'write')}
                      className="sr-only"
                      aria-label={`Write access for ${permission.module}`}
                    />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                                   transition-all duration-200 ease-out group-hover:shadow-sm
                                   ${permission.write
                                     ? "bg-blue-500 border-blue-500 shadow-sm shadow-blue-500/20"
                                     : "border-gray-300/60 dark:border-gray-600/60 group-hover:border-gray-400/60 dark:group-hover:border-gray-500/60"
                                   }`}>
                      {permission.write && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors duration-200">Write</span>
                  </label>

                  {/* Execute */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={permission.execute}
                      onChange={() => togglePermission(index, 'execute')}
                      className="sr-only"
                      aria-label={`Execute access for ${permission.module}`}
                    />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                                   transition-all duration-200 ease-out group-hover:shadow-sm
                                   ${permission.execute
                                     ? "bg-violet-500 border-violet-500 shadow-sm shadow-violet-500/20"
                                     : "border-gray-300/60 dark:border-gray-600/60 group-hover:border-gray-400/60 dark:group-hover:border-gray-500/60"
                                   }`}>
                      {permission.execute && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors duration-200">Execute</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3.5 bg-amber-50/80 dark:bg-amber-900/10 rounded-xl border border-amber-200/60 dark:border-amber-700/60">
            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                <strong className="font-semibold">Note:</strong> Write permission automatically grants Read, and Execute grants both Read and Write.
              </span>
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl
                       hover:bg-gray-200 dark:hover:bg-gray-700
                       border border-gray-200/60 dark:border-gray-700/60 hover:border-gray-300/60 dark:hover:border-gray-600/60
                       transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm
                       focus:ring-2 focus:ring-blue-500/50 focus:outline-none
                       font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5
                       bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                       text-white rounded-xl font-semibold
                       border border-transparent hover:border-blue-400/60 dark:hover:border-blue-300/60
                       shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                       transition-all duration-200 ease-out hover:-translate-y-0.5
                       focus:ring-2 focus:ring-blue-500/50 focus:outline-none
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
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
