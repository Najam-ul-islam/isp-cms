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
  clientPhone?: string;
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
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
        setComplaints(data);
      } catch (error) {
        console.error('Error fetching complaints:', error);
        showNotification('error', 'Failed to load complaints');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [router]);


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

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Create new complaint
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComplaint.clientId || !newComplaint.title || !newComplaint.description) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/complaints/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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

  // Delete complaint
  const deleteComplaint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this complaint?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
          <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Complaints
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Manage and track client complaints and issues
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
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
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">All Complaints</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-gray-900/50">
              <tr className="text-left text-sm font-medium text-slate-500 dark:text-gray-400">
                <th className="px-6 py-4">Complaint</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
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
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800 dark:text-white">{complaint.title}</p>
                        <p className="text-sm text-slate-500 dark:text-gray-400 line-clamp-2">
                          {complaint.description}
                        </p>
                      </div>
                    </td>

                    {/* Client Info */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-700 dark:text-gray-200">
                          {complaint.clientName || 'N/A'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-gray-400">
                          {complaint.clientPhone || 'N/A'}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <select
                        value={complaint.status}
                        onChange={(e) => updateComplaintStatus(complaint.id, e.target.value as any)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getStatusStyles(complaint.status)}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getPriorityStyles(complaint.priority)}`}>
                        {complaint.priority}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500 dark:text-gray-400">
                        {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => deleteComplaint(complaint.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group/btn"
                          title="Delete complaint"
                        >
                          <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-gray-500">
                      <div className="p-4 bg-slate-100 dark:bg-gray-800 rounded-full">
                        <MessageCircle className="w-12 h-12 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">No complaints found</p>
                        <p className="text-sm mt-1">
                          {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                            ? 'Try adjusting your filters or search terms'
                            : 'Get started by adding your first complaint'}
                        </p>
                      </div>
                      {!searchTerm && filterStatus === 'all' && filterPriority === 'all' && (
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                          <Plus className="w-4 h-4" />
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