"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, User, Shield, Mail, Phone, Plus, Search, Edit, Trash2, Eye } from "lucide-react";

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
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Decode JWT token to check role
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN');
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  const handleRoleChange = async (employeeId: string, newRole: string) => {
    if (!isAdmin) {
      alert('Only administrators can change roles');
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/employees", {
        method: "PUT",
        headers,
        credentials: "include",
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
        const token = localStorage.getItem("token");

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`/api/employees?search=${searchTerm}`, {
          headers,
          credentials: "include",
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              Employee Management
            </h1>
            <p className="text-slate-600 mt-2">
              Manage your team members and their access rights
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/employees/new")}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Employees</p>
              <p className="text-3xl font-bold text-slate-800">{employees.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Administrators</p>
              <p className="text-3xl font-bold text-indigo-600">{adminCount}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Staff Members</p>
              <p className="text-3xl font-bold text-blue-600">{employeeCount}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
          />
        </div>
      </div>

      {/* Employee Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Employee</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Salary</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-500">Join Date</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{emp.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{emp.email}</td>
                      <td className="px-6 py-4 text-slate-600">{emp.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={emp.role}
                            onChange={(e) => handleRoleChange(emp.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded border ${
                              emp.role === 'ADMIN'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                                : emp.role === 'EMPLOYEE'
                                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                            disabled={!isAdmin} // Only admins can change roles
                          >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                          </select>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            emp.role === 'ADMIN'
                              ? 'bg-indigo-100 text-indigo-800'
                              : emp.role === 'EMPLOYEE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-800'
                          }`}>
                            {emp.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {emp.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">Rs {emp.salary?.toLocaleString() || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(emp.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/employees/${emp.id}/edit`)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {/* Implement delete */}}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
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
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Users className="w-12 h-12 opacity-50" />
                        <p className="font-medium">No employees found</p>
                        <p className="text-sm">
                          {searchTerm ? "Try adjusting your search" : "Add your first employee"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}