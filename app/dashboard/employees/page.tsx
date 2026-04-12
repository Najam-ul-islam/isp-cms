"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, User, Shield, Mail, Phone, Plus, Search, Edit, Trash2, Eye, RefreshCw } from "lucide-react";

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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false); // Track if current user is admin
  const router = useRouter();

  useEffect(() => {
    // Check if current user is admin
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include' // This ensures cookies are sent with the request
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN');
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, []);

  const handleRoleChange = async (employeeId: string, newRole: string) => {
    if (!isAdmin) {
      alert('Only administrators can change roles');
      return;
    }

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

      const response = await fetch("/api/employees", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: employeeId,
          action: 'assign-role',
          role: newRole
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.ok) {
        // Update the employee in the local state
        setEmployees(prev => prev.map(emp =>
          emp.id === employeeId ? { ...emp, role: newRole } : emp
        ));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("An error occurred while updating the role");
    }
  };

  useEffect(() => {
    const fetchEmployees = async () => {
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

        const response = await fetch(`/api/employees?search=${searchTerm}`, {
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
          setEmployees(data);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [searchTerm, router]);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminCount = employees.filter(emp => emp.role === 'ADMIN').length;
  const employeeCount = employees.filter(emp => emp.role === 'EMPLOYEE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 rounded-2xl p-6 border border-gray-200/60 dark:border-gray-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <Users className="w-7 h-7 text-violet-600 dark:text-violet-400" />
              </div>
              Employee Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 ml-14">
              Manage your team members and their access rights
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/employees/new")}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl
                       border border-transparent hover:border-blue-400/60 dark:hover:border-blue-300/60
                       shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                       transition-all duration-200 ease-out hover:-translate-y-0.5
                       focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-2xl p-6 transition-all duration-300 ease-out
                        hover:border-blue-500/60 dark:hover:border-blue-400/60
                        hover:bg-blue-50/50 dark:hover:bg-blue-900/20
                        hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-50 mt-1">{employees.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl transition-all duration-200 ease-out">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-2xl p-6 transition-all duration-300 ease-out
                        hover:border-violet-500/60 dark:hover:border-violet-400/60
                        hover:bg-violet-50/50 dark:hover:bg-violet-900/20
                        hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Administrators</p>
              <p className="text-3xl font-bold text-violet-600 dark:text-violet-400 mt-1">{adminCount}</p>
            </div>
            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl transition-all duration-200 ease-out">
              <Shield className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-2xl p-6 transition-all duration-300 ease-out
                        hover:border-emerald-500/60 dark:hover:border-emerald-400/60
                        hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20
                        hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Staff Members</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{employeeCount}</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl transition-all duration-200 ease-out">
              <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-4 transition-all duration-300 ease-out">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500
                         transition-all duration-200 ease-out"
            />
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl overflow-hidden transition-all duration-300 ease-out">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg transition-all duration-200 ease-out">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-50">All Employees</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 ease-out group
                       focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            title="Refresh"
            aria-label="Refresh employee list"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-200 ease-out ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Join Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp, index) => (
                    <tr key={emp.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-all duration-200 ease-out group" style={{ animationDelay: `${index * 50}ms` }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md shadow-violet-500/20 transition-all duration-200 ease-out group-hover:shadow-lg group-hover:shadow-violet-500/30">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-50">{emp.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{emp.email}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{emp.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={emp.role}
                            onChange={(e) => handleRoleChange(emp.id, e.target.value)}
                            disabled={!isAdmin}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium cursor-pointer
                                       transition-all duration-200 ease-out
                                       focus:ring-2 focus:ring-blue-500/20 focus:outline-none
                                       ${emp.role === 'ADMIN'
                                ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-200/60 dark:border-violet-700/60 text-violet-800 dark:text-violet-300'
                                : emp.role === 'EMPLOYEE'
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200/60 dark:border-blue-700/60 text-blue-800 dark:text-blue-300'
                                  : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200/60 dark:border-amber-700/60 text-amber-800 dark:text-amber-300'
                              }
                              ${!isAdmin ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}
                          >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                          {emp.salary ? `Rs ${emp.salary.toLocaleString()}` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {new Date(emp.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => router.push(`/dashboard/employees/${emp.id}/edit`)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg
                                       transition-all duration-200 ease-out hover:shadow-sm
                                       focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                            title="Edit employee"
                            aria-label={`Edit ${emp.name}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {/* Implement delete */}}
                            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg
                                       transition-all duration-200 ease-out hover:shadow-sm
                                       focus:ring-2 focus:ring-rose-500/50 focus:outline-none"
                            title="Delete employee"
                            aria-label={`Delete ${emp.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full transition-all duration-200 ease-out">
                          <Users className="w-12 h-12 opacity-50" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-600 dark:text-gray-400">No employees found</p>
                          <p className="text-sm mt-0.5 text-gray-500 dark:text-gray-500">
                            {searchTerm ? "Try adjusting your search" : "Add your first employee"}
                          </p>
                        </div>
                        {!searchTerm && (
                          <button
                            onClick={() => router.push("/dashboard/employees/new")}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium
                                       transition-all duration-200 ease-out hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5
                                       focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                          >
                            <Plus className="w-4 h-4" /> Add Employee
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}