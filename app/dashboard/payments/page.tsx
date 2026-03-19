'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Plus, Search, Calendar, FileText, Edit, Trash2, Download, Filter, IndianRupee } from 'lucide-react';

interface Payment {
  id: string;
  clientName: string;
  clientId: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const router = useRouter();

  const paymentMethods = [
    'Cash', 'Bank Transfer', 'Online', 'Credit Card', 'Debit Card', 'Mobile Payment'
  ];

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/payments', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Since the API returns payment with client details, we need to map it to our Payment interface
          const mappedPayments = data.map((p: any) => ({
            id: p.id,
            clientName: p.client?.name || 'Unknown Client',
            clientId: p.clientId,
            amount: p.amount,
            date: p.paymentDate,
            method: p.method || 'Cash',
            notes: p.notes || ''
          }));
          setPayments(mappedPayments);
        } else if (response.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [router]);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.method.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod = selectedMethod === 'all' || payment.method === selectedMethod;

    return matchesSearch && matchesMethod;
  });

  const totalPayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const handleAddPayment = () => {
    setEditingPayment(null);
    setShowForm(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setShowForm(true);
  };

  const handleDeletePayment = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/payments/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setPayments(payments.filter(payment => payment.id !== id));
        } else if (response.status === 401) {
          router.push('/login');
        } else {
          alert('Failed to delete payment');
        }
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Failed to delete payment');
      }
    }
  };

  const handleSavePayment = async (paymentData: Partial<Payment>) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      if (editingPayment) {
        // Update existing payment
        const response = await fetch(`/api/payments/${editingPayment.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        });

        if (response.ok) {
          const updatedPayment = await response.json();
          const mappedPayment = {
            id: updatedPayment.id,
            clientName: updatedPayment.client?.name || 'Unknown Client',
            clientId: updatedPayment.clientId,
            amount: updatedPayment.amount,
            date: updatedPayment.paymentDate,
            method: updatedPayment.method || 'Cash',
            notes: updatedPayment.notes || ''
          };

          setPayments(payments.map(pay =>
            pay.id === editingPayment.id ? mappedPayment : pay
          ));
          setShowForm(false);
        } else if (response.status === 401) {
          router.push('/login');
        } else {
          alert('Failed to update payment');
        }
      } else {
        // Add new payment
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        });

        if (response.ok) {
          const newPayment = await response.json();
          const mappedNewPayment = {
            id: newPayment.id,
            clientName: newPayment.client?.name || 'Unknown Client',
            clientId: newPayment.clientId,
            amount: newPayment.amount,
            date: newPayment.paymentDate,
            method: newPayment.method || 'Cash',
            notes: newPayment.notes || ''
          };

          setPayments([...payments, mappedNewPayment]);
          setShowForm(false);
        } else if (response.status === 401) {
          router.push('/login');
        } else {
          alert('Failed to add payment');
        }
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Failed to save payment');
    }
  };

  if (loading) {
    return <PaymentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {/* Note: This is a placeholder - you may want to implement a proper notification system */}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:text-slate-800 dark:to-gray-300 bg-clip-text text-transparent">
            Payments
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Track and manage client payments
          </p>
        </div>
        <button
          onClick={handleAddPayment}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Add New Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="p-5 bg-white rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-slate-500">Total Payments</p>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            Rs {totalPayments.toLocaleString("en-PK")}
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-slate-500">Total Records</p>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {filteredPayments.length}
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-slate-500">Avg. Payment</p>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            Rs {filteredPayments.length ? Math.round(totalPayments / filteredPayments.length).toLocaleString("en-PK") : '0'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Method Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white appearance-none cursor-pointer"
            >
              <option value="all">All Methods</option>
              {paymentMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
              placeholder="Start date"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">All Payments</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-gray-900/50">
              <tr className="text-left text-sm font-medium text-slate-500 dark:text-gray-400">
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment, index) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-white">{payment.clientName}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300">
                      {new Date(payment.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full font-medium">
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Rs {payment.amount.toLocaleString("en-PK")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-400">
                      {payment.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditPayment(payment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group/btn"
                          title="Edit payment"
                        >
                          <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group/btn"
                          title="Delete payment"
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
                        <CreditCard className="w-12 h-12 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">No payments found</p>
                        <p className="text-sm mt-1">
                          {searchTerm ? `No results for "${searchTerm}"` : 'Get started by adding your first payment'}
                        </p>
                      </div>
                      {!searchTerm && (
                        <button
                          onClick={handleAddPayment}
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add Payment
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

      {/* Add/Edit Payment Modal */}
      {showForm && (
        <PaymentFormModal
          payment={editingPayment}
          onClose={() => setShowForm(false)}
          onSave={handleSavePayment}
          paymentMethods={paymentMethods}
        />
      )}
    </div>
  );
}

// Payment Form Modal Component
function PaymentFormModal({
  payment,
  onClose,
  onSave,
  paymentMethods
}: {
  payment: Payment | null;
  onClose: () => void;
  onSave: (data: Partial<Payment>) => void;
  paymentMethods: string[];
}) {
  const [formData, setFormData] = useState({
    clientName: payment?.clientName || '',
    clientId: payment?.clientId || '',
    amount: payment?.amount || 0,
    date: payment?.date || new Date().toISOString().split('T')[0],
    method: payment?.method || paymentMethods[0],
    notes: payment?.notes || ''
  });

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/clients', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Map clients to id/name pairs
          const clientOptions = data.map((client: any) => ({
            id: client.id,
            name: client.name
          }));
          setClients(clientOptions);

          // If editing, set the correct client
          if (payment) {
            const matchedClient = clientOptions.find((c: { id: string }) => c.id === payment.clientId);
            if (matchedClient) {
              setFormData(prev => ({
                ...prev,
                clientName: matchedClient.name,
                clientId: matchedClient.id
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [payment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'clientName') {
      // Find the corresponding client ID when client name is selected
      const selectedClient = clients.find(client => client.name === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        clientId: selectedClient ? selectedClient.id : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'amount' ? Number(value) : value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (loadingClients) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {payment ? 'Edit Payment' : 'Add New Payment'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {payment ? 'Edit Payment' : 'Add New Payment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
            <select
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select a client</option>
              {clients.map(client => (
                <option key={client.id} value={client.name}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
            <select
              name="method"
              value={formData.method}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              {paymentMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              placeholder="Enter payment notes (optional)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
            >
              {payment ? 'Update' : 'Add'} Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==================== SKELETON LOADING ==================== */

function PaymentsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-10 w-40 bg-slate-200 dark:bg-gray-700 rounded-xl" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid md:grid-cols-3 gap-5">
        {[1, 2, 3].map((item) => (
          <div key={item} className="p-5 bg-white dark:bg-gray-800 rounded-xl border">
            <div className="flex justify-between items-center mb-3">
              <div className="h-4 w-24 bg-slate-100 dark:bg-gray-700 rounded" />
              <div className="w-10 h-10 bg-slate-100 dark:bg-gray-700 rounded-xl" />
            </div>
            <div className="h-8 w-16 bg-slate-200 dark:bg-gray-600 rounded" />
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-slate-200 dark:border-gray-700">
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-48 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-40 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-40 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700">
          <div className="h-5 w-40 bg-slate-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-100 dark:bg-gray-900 rounded" />
                <div className="h-3 w-24 bg-slate-50 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-24 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-8 w-20 bg-slate-100 dark:bg-gray-900 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}