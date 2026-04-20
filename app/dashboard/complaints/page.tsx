'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Mail, Users, AlertCircle, Clock, CheckCircle, ChevronDown, Search, Plus, Edit2, Trash2 } from 'lucide-react';

interface Complaint {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  clientUsername?: string;
  clientPhone?: string;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  } | null;
}

interface Employee {
  id: string;
  name: string;
  email?: string;
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    clientId: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [clients, setClients] = useState<{id: string, name: string, phone: string}[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(false); // Track if clients have been loaded
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch clients for dropdown
  const fetchClients = useCallback(async () => {
    if (clientsLoaded) return; // Don't fetch again if already loaded

    setClientsLoading(true);
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

      const response = await fetch('/api/clients', {
        credentials: 'include', // This ensures cookies are sent with the request
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data = await response.json();

      // Transform the data to match the expected format
      const formattedClients = data.map((client: any) => ({
        id: client.id,
        name: client.name,
        phone: client.phone
      }));

      setClients(formattedClients);
      setClientsLoaded(true); // Mark clients as loaded
    } catch (error) {
      console.error('Error fetching clients:', error);
      showNotification('error', 'Failed to load clients');
    } finally {
      setClientsLoading(false);
    }
  }, [router, showNotification, clientsLoaded]);

  // Fetch complaints
  useEffect(() => {
    const fetchComplaints = async () => {
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

        const response = await fetch(`/api/complaints`, {
          credentials: 'include', // This ensures cookies are sent with the request
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch complaints');
        }

        const data = await response.json();
        // Map complaints to include username
        const mappedData = data.map((complaint: any) => ({
          ...complaint,
          clientUsername: complaint.client?.username || undefined,
          clientName: complaint.client?.name || complaint.clientName,
          clientPhone: complaint.client?.phone || complaint.clientPhone,
        }));
        setComplaints(mappedData);
      } catch (error) {
        console.error('Error fetching complaints:', error);
        showNotification('error', 'Failed to load complaints');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [router]);

  // Fetch employees for assignment dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch clients when create modal is opened
  useEffect(() => {
    if (showCreateModal && !clientsLoaded) {
      fetchClients();
    }
  }, [showCreateModal, clientsLoaded, fetchClients]);

  // Filter complaints based on search and filters
  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (complaint.clientName && complaint.clientName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || complaint.priority === filterPriority;
    const matchesAssigned = filterAssigned === 'all' || 
      (filterAssigned === 'assigned' && complaint.assignedToId) ||
      (filterAssigned === 'unassigned' && !complaint.assignedToId);

    return matchesSearch && matchesStatus && matchesPriority && matchesAssigned;
  });

  // Create new complaint
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComplaint.clientId || !newComplaint.title || !newComplaint.description) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include httpOnly cookies
        body: JSON.stringify(newComplaint)
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create complaint');
      }

      const createdComplaint = await response.json();
      setComplaints([createdComplaint, ...complaints]);
      setShowCreateModal(false);
      setClientsLoaded(false); // Reset the loaded flag so clients will be fetched again next time
      setNewComplaint({
        clientId: '',
        title: '',
        description: '',
        priority: 'medium'
      });
      showNotification('success', 'Complaint created successfully');
    } catch (error: any) {
      console.error('Error creating complaint:', error);
      showNotification('error', error.message || 'Failed to create complaint');
    }
  };

  // Update complaint status
  const updateComplaintStatus = async (id: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      const response = await fetch(`/api/complaints/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include httpOnly cookies
        body: JSON.stringify({ status })
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update complaint');
      }

      const updatedComplaint = await response.json();
      setComplaints(complaints.map(c => c.id === id ? updatedComplaint : c));
      showNotification('success', 'Complaint updated successfully');
    } catch (error: any) {
      console.error('Error updating complaint:', error);
      showNotification('error', error.message || 'Failed to update complaint');
    }
  };

  // Assign complaint to employee
  const assignComplaint = async (complaintId: string, employeeId: string | null) => {
    setAssigningId(complaintId);
    try {
      const response = await fetch(`/api/complaints/${complaintId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ employeeId })
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign complaint');
      }

      const updatedComplaint = await response.json();
      setComplaints(complaints.map(c => c.id === complaintId ? {
        ...c,
        assignedToId: updatedComplaint.assignedToId,
        assignedTo: updatedComplaint.assignedTo
      } : c));
      showNotification('success', employeeId ? 'Complaint assigned successfully' : 'Complaint unassigned');
    } catch (error: any) {
      console.error('Error assigning complaint:', error);
      showNotification('error', error.message || 'Failed to assign complaint');
    } finally {
      setAssigningId(null);
    }
  };

  // Delete complaint
  const deleteComplaint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this complaint?')) {
      return;
    }

    try {
      const response = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE',
        credentials: 'include' // Include httpOnly cookies
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete complaint');
      }

      setComplaints(complaints.filter(c => c.id !== id));
      showNotification('success', 'Complaint deleted successfully');
    } catch (error: any) {
      console.error('Error deleting complaint:', error);
      showNotification('error', error.message || 'Failed to delete complaint');
    }
  };

  // Get status badge styles
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'in_progress':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get priority badge styles
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`
          fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3
          animate-slide-in backdrop-blur-xl border
          ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : ''}
          ${notification.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : ''}
        `}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Complaints
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Manage and track client complaints and issues
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Add New Complaint
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, description, or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Assignment Filter */}
          <div className="relative">
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value as any)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35"
            >
              <option value="all">All Assignments</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-4 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <MessageCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-800 dark:text-white">All Complaints</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-gray-900/50">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Complaint</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint, index) => (
                  <tr
                    key={complaint.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Complaint Info */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 max-w-xs">
                        <p className="font-semibold text-xs text-slate-800 dark:text-white truncate">{complaint.title}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2">
                          {complaint.description}
                        </p>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3">
                      <span className="text-slate-600 dark:text-gray-300 font-mono text-xs">
                        {complaint.clientUsername || 'N/A'}
                      </span>
                    </td>

                    {/* Client Info */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-xs text-slate-700 dark:text-gray-200">
                          {complaint.clientName || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          {complaint.clientPhone || 'N/A'}
                        </p>
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={complaint.assignedToId || ''}
                          onChange={(e) => assignComplaint(complaint.id, e.target.value || null)}
                          disabled={assigningId === complaint.id}
                          className={`appearance-none w-full pl-2 pr-6 py-1 text-xs rounded-md border transition-all cursor-pointer ${
                            complaint.assignedToId
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                          } ${assigningId === complaint.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="">Unassigned</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        {complaint.assignedToId && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]">
                              {complaint.assignedTo?.name || 'Assigned'}
                            </span>
                          </div>
                        )}
                        {!complaint.assignedToId && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                            <span className="text-[10px] text-rose-500 dark:text-rose-400">
                              Unassigned
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <select
                        value={complaint.status}
                        onChange={(e) => updateComplaintStatus(complaint.id, e.target.value as any)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${getStatusStyles(complaint.status)}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${getPriorityStyles(complaint.priority)}`}>
                        {complaint.priority}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit'
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => deleteComplaint(complaint.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors group/btn"
                          title="Delete complaint"
                        >
                          <Trash2 className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-gray-500">
                      <div className="p-3 bg-slate-100 dark:bg-gray-800 rounded-full">
                        <MessageCircle className="w-10 h-10 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold text-base text-slate-600 dark:text-gray-400">No complaints found</p>
                        <p className="text-xs mt-1 text-slate-500 dark:text-gray-500">
                          {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' || filterAssigned !== 'all'
                            ? 'Try adjusting your filters or search terms'
                            : 'Get started by adding your first complaint'}
                        </p>
                      </div>
                      {!searchTerm && filterStatus === 'all' && filterPriority === 'all' && filterAssigned === 'all' && (
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Complaint
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Complaint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Complaint</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setClientsLoaded(false); // Reset the loaded flag so clients will be fetched again next time
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Client *
                </label>
                {clientsLoading ? (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 animate-pulse">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  </div>
                ) : (
                  <select
                    value={newComplaint.clientId}
                    onChange={(e) => setNewComplaint({...newComplaint, clientId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 cursor-pointer"
                    required
                  >
                    <option value="">Select a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.phone}) - ID: {client.id}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newComplaint.title}
                  onChange={(e) => setNewComplaint({...newComplaint, title: e.target.value})}
                  placeholder="Enter complaint title"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({...newComplaint, description: e.target.value})}
                  placeholder="Describe the complaint in detail"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 resize-none"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={newComplaint.priority}
                  onChange={(e) => setNewComplaint({...newComplaint, priority: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setClientsLoaded(false); // Reset the loaded flag so clients will be fetched again next time
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}