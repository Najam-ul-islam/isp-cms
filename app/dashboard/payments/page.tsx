"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  FileText,
  Edit,
  Trash2,
  Download,
  Filter,
  IndianRupee,
  TrendingUp,
} from "lucide-react";

// ✅ Type definition for payment records
// All fields must be primitive types (string, number) - NEVER objects
interface Payment {
  id: string;
  clientName: string;
  clientUsername?: string;
  clientId: string;
  invoiceId?: string; // Required - all payments must be linked to an invoice
  invoiceNumber?: string | null; // Display-friendly invoice number
  area?: string; // ⚠️ Must be area NAME string, NOT area object
  amount: number;
  date: string;
  method: string;
  notes?: string;
  totalPaid?: number;
  remainingAmount?: number;
  totalAmount?: number; // Total amount based on package or subscription
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  // Notification state for payment actions
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  // Real-time stats state
  const [pendingRecovery, setPendingRecovery] = useState<number>(0);
  const [showPendingClients, setShowPendingClients] = useState(false);
  const [pendingClientsList, setPendingClientsList] = useState<Array<{
    id: string;
    name: string;
    phone?: string;
    totalAmount: number;
    totalPaid: number;
    remaining: number;
  }>>([]);

  // Client details modal state
  const [selectedClientDetails, setSelectedClientDetails] = useState<Payment | null>(null);
  const [fullClientDetails, setFullClientDetails] = useState<any>(null);
  const [clientDetailsLoading, setClientDetailsLoading] = useState(false);

  const router = useRouter();

  const paymentMethods = [
    "Cash",
    "Bank Transfer",
    "Online",
    "Credit Card",
    "Debit Card",
    "Mobile Payment",
  ];

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
  };

  // Calculate pending recovery by fetching actual client data with payment summaries
  const calculatePendingRecovery = useCallback(async () => {
    try {
      // Fetch all clients first
      const clientsResponse = await fetch('/api/clients', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!clientsResponse.ok) {
        console.error('Failed to fetch clients');
        // Fallback: try to fetch from financial-summary
        const fallbackRes = await fetch('/api/dashboard/financial-summary', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setPendingRecovery(fallbackData.pendingRecovery || 0);
          setPendingClientsList([]);
        }
        return;
      }

      const clients = await clientsResponse.json();
      
      // Handle both {data: [...]} and [...] response formats
      const clientList = Array.isArray(clients) ? clients : (clients.data || []);
      
      if (!clientList || clientList.length === 0) {
        setPendingRecovery(0);
        setPendingClientsList([]);
        return;
      }
      
// Use existing client data - no need for separate API calls
      // The /api/clients endpoint already returns totalPaid and remainingAmount
      const pendingClients: Array<{
        id: string;
        name: string;
        phone?: string;
        totalAmount: number;
        totalPaid: number;
        remaining: number;
      }> = [];

      let totalPending = 0;

      for (const client of clientList) {
        const remaining = client.remainingAmount ?? 0;
        if (remaining > 0) {
          pendingClients.push({
            id: client.id,
            name: client.name,
            phone: client.phone,
            totalAmount: client.price || 0,
            totalPaid: client.totalPaid || 0,
            remaining: remaining,
          });
totalPending += remaining;
        }
      }

      setPendingRecovery(totalPending);
      setPendingClientsList(pendingClients.sort((a, b) => b.remaining - a.remaining));
    } catch (error) {
      console.error('Error calculating pending recovery:', error);
    }
  }, []);

  // Handler to fetch full client details when clicking on a client name
  const handleClientClick = useCallback(async (payment: Payment) => {
    try {
      setClientDetailsLoading(true);
      setSelectedClientDetails(payment);
      
      // Fetch full client details from API
      const response = await fetch(`/api/clients/${payment.clientId}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const clientData = await response.json();
        setFullClientDetails(clientData);
      } else {
        console.error('Failed to fetch client details');
        setFullClientDetails(null);
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
      setFullClientDetails(null);
    } finally {
      setClientDetailsLoading(false);
    }
  }, []);

  // Use refs to prevent duplicate API calls
  const isMounted = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchPayments = useCallback(async (signal: AbortSignal, range: { start: string; end: string }) => {
    try {
      // Check if user is authenticated by making a simple API call
      const authCheck = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
        signal
      });

      if (authCheck.status === 401) {
        if (isMounted.current) {
          router.push('/login');
        }
        return;
      }

      // Build query parameters for date range
      let url = "/api/payments";
      const params = new URLSearchParams();

      if (range.start) {
        params.append('startDate', range.start);
      }
      if (range.end) {
        params.append('endDate', range.end);
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        signal
      });

      if (response.ok) {
        const data = await response.json();
        // Since the API returns payment with client details, we need to map it to our Payment interface
         const mappedPayments = data.map((p: any) => {
           // Client name without area
           const clientName = p.client?.name || "Unknown Client";

           // ✅ Use totalAmount from API - already includes invoices + charges + product sales
           const totalAmount = p.totalAmount ?? 0;

           // Extract area name instead of the entire area object
           const areaName = p.client?.area?.name || p.client?.areaName || "-";

           return {
             id: p.id,
             clientName,
             clientUsername: p.client?.username || undefined,
             clientId: p.clientId,
             invoiceId: p.invoiceId,
             invoiceNumber: p.invoice?.invoiceNumber || undefined,
             area: areaName,
             amount: p.amount,
             date: p.paymentDate,
             method: p.method || "Cash",
             notes: p.notes || "",
             totalAmount,
             totalPaid: p.totalPaid ?? 0,
             remainingAmount: Math.max(p.remainingAmount ?? 0, 0), // ✅ Ensure never negative
           };
         });
        
        if (isMounted.current) {
          setPayments(mappedPayments);
          calculatePendingRecovery();
          setLoading(false);
        }
      } else if (response.status === 401) {
        if (isMounted.current) {
          router.push("/login");
        }
      }
    } catch (error: any) {
      // Don't show error for aborted requests
      if (error.name !== 'AbortError') {
        console.error("Error fetching payments:", error);
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }
  }, [router]);

  useEffect(() => {
    isMounted.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchPayments(controller.signal, dateRange);

    // Cleanup function
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [router, dateRange.start, dateRange.end, fetchPayments]);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.method.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod =
      selectedMethod === "all" || payment.method === selectedMethod;

    // Apply date range filter if dates are selected
    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const paymentDate = new Date(payment.date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      matchesDate = paymentDate >= startDate && paymentDate <= endDate;
    } else if (dateRange.start) {
      const paymentDate = new Date(payment.date);
      const startDate = new Date(dateRange.start);
      matchesDate = paymentDate >= startDate;
    } else if (dateRange.end) {
      const paymentDate = new Date(payment.date);
      const endDate = new Date(dateRange.end);
      matchesDate = paymentDate <= endDate;
    }

    return matchesSearch && matchesMethod && matchesDate;
  });

  const totalPayments = filteredPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  const handleAddPayment = () => {
    setEditingPayment(null);
    setShowForm(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setShowForm(true);
  };

  const handleDeletePayment = async (id: string) => {
    if (confirm("Are you sure you want to delete this payment?")) {
      try {
        const response = await fetch(`/api/payments/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include' // This ensures cookies are sent with the request
        });

        if (response.ok) {
          setPayments(payments.filter((payment) => payment.id !== id));
          showNotification('success', 'Payment deleted successfully');
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          showNotification('error', 'Failed to delete payment. Please try again.');
        }
      } catch (error) {
        console.error("Error deleting payment:", error);
        showNotification('error', 'Failed to delete payment. Please try again.');
      }
    }
  };

  const handleSavePayment = async (paymentData: Partial<Payment>) => {
    setSavingPayment(true);
    try {

      if (editingPayment) {
        // Update existing payment
        const response = await fetch(`/api/payments/${editingPayment.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include', // This ensures cookies are sent with the request
          body: JSON.stringify(paymentData),
        });

        if (response.ok) {
          const updatedPayment = await response.json();

          // Client name without area
          const clientName = updatedPayment.client?.name || "Unknown Client";

          // ✅ Use totalAmount from API - already includes invoices + charges + product sales
          const totalAmount = updatedPayment.totalAmount ?? 0;

          // ✅ FIX: Extract area NAME string, not the full area object
          const areaName = updatedPayment.client?.area?.name || updatedPayment.client?.areaName || "-";

          const mappedPayment = {
            id: updatedPayment.id,
            clientName,
            clientId: updatedPayment.clientId,
            area: areaName,
            amount: updatedPayment.amount,
            date: updatedPayment.paymentDate,
            method: updatedPayment.method || "Cash",
            notes: updatedPayment.notes || "",
            totalAmount,
            totalPaid: updatedPayment.totalPaid ?? 0,
            remainingAmount: Math.max(updatedPayment.remainingAmount ?? 0, 0), // ✅ Ensure never negative
          };

          // Update all payments for this client with the new totalPaid values
          const updatedPayments = payments.map((pay) => {
            if (pay.clientId === updatedPayment.clientId) {
              return {
                ...pay,
                totalPaid: updatedPayment.totalPaid || 0,
                remainingAmount: updatedPayment.remainingAmount || 0,
              };
            }
            return pay;
          });

          setPayments(
            updatedPayments.map((pay) =>
              pay.id === editingPayment.id ? mappedPayment : pay,
            ),
          );
          setShowForm(false);
          showNotification('success', `Payment updated successfully for ${clientName}`);
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          showNotification('error', 'Failed to update payment. Please try again.');
        }
      } else {
        // Add new payment
        const response = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include', // This ensures cookies are sent with the request
          body: JSON.stringify(paymentData),
        });

        if (response.ok) {
          const newPayment = await response.json();

          // Client name without area
          const clientName = newPayment.client?.name || "Unknown Client";

          // ✅ Use totalAmount from API - already includes invoices + charges + product sales
          const totalAmount = newPayment.totalAmount ?? 0;

          // ✅ FIX: Extract area NAME string, not the full area object
          const areaName = newPayment.client?.area?.name || newPayment.client?.areaName || "-";

          const mappedNewPayment = {
            id: newPayment.id,
            clientName,
            clientId: newPayment.clientId,
            area: areaName,
            amount: newPayment.amount,
            date: newPayment.paymentDate,
            method: newPayment.method || "Cash",
            notes: newPayment.notes || "",
            totalAmount,
            totalPaid: newPayment.totalPaid ?? 0,
            remainingAmount: Math.max(newPayment.remainingAmount ?? 0, 0), // ✅ Ensure never negative
          };

          // Update all payments for this client with the new totalPaid values
          // This ensures all existing payments for the client show the correct cumulative total
          const updatedPayments = payments.map((pay) => {
            if (pay.clientId === newPayment.clientId) {
              // Update this payment with the new totals from the response
              return {
                ...pay,
                totalPaid: newPayment.totalPaid || 0,
                remainingAmount: newPayment.remainingAmount || 0,
              };
            }
            return pay;
          });

          // Add the new payment to the list
          setPayments([...updatedPayments, mappedNewPayment]);
          setShowForm(false);
          showNotification('success', `Payment of Rs. ${newPayment.amount.toLocaleString('en-PK')} added for ${clientName}`);
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          showNotification('error', 'Failed to add payment. Please try again.');
        }

      }
    } catch (error) {
      console.error("Error saving payment:", error);
      showNotification('error', 'Failed to save payment. Please try again.');
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading) {
    return <PaymentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border transition-all transform animate-slide-in-right ${
          notification.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/90 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
            : notification.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
            : 'bg-blue-50 dark:bg-blue-900/90 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : notification.type === 'error' ? (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Payments
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Track and manage client payments
          </p>
        </div>
        <button
          onClick={handleAddPayment}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Add New Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Total Payments</p>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            Rs {totalPayments.toLocaleString("en-PK")}
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">{filteredPayments.length} payments</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Total Records</p>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{filteredPayments.length}</div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">Payment records</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Avg. Payment</p>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            Rs{" "}
            {filteredPayments.length
              ? Math.round(
                  totalPayments / filteredPayments.length,
                ).toLocaleString("en-PK")
              : "0"}
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">Per payment average</p>
        </div>

        {/* Pending Recovery Card - Clickable */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer hover:border-orange-300 dark:hover:border-orange-700"
          onClick={() => setShowPendingClients(true)}
        >
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Pending Recovery</p>
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            pendingRecovery > 0 
              ? 'text-orange-600 dark:text-orange-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            Rs {pendingRecovery.toLocaleString("en-PK")}
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
            {pendingRecovery > 0 ? `${pendingClientsList.length} client${pendingClientsList.length > 1 ? 's' : ''} pending` : 'All cleared'}
          </p>
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
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
              placeholder="Start date"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">
                All Payments
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {filteredPayments.length} payment
                {filteredPayments.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-gray-900/50">
              <tr className="text-left text-sm font-medium text-slate-500 dark:text-gray-400">
                <th className="px-3 py-4">Invoice ID</th>
                <th className="px-3 py-4">Username</th>
                <th className="px-3 py-4">Client</th>
                <th className="px-3 py-4">Area</th>
                <th className="px-3 py-4">Total Amount</th>
                <th className="px-3 py-4">Total Paid</th>
                <th className="px-3 py-4">Remaining</th>
                <th className="px-3 py-4">Date</th>
                <th className="px-3 py-4">Method</th>
                <th className="px-3 py-4">Amount</th>
                <th className="px-3 py-4 text-right">Actions</th>
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
                    {/* Invoice ID Column */}
                    <td className="px-3 py-4">
                      <span className="text-blue-600 dark:text-blue-400 font-mono text-xs font-semibold">
                        {payment.invoiceNumber ? `#${payment.invoiceNumber}` : payment.invoiceId ? `#${payment.invoiceId.slice(-8).toUpperCase()}` : '-'}
                      </span>
                    </td>

                    {/* Username Column */}
                    <td className="px-3 py-4">
                      <span className="text-slate-600 dark:text-gray-300 font-mono text-sm">
                        {payment.clientUsername || "-"}
                      </span>
                    </td>

                    {/* Client Column */}
                    <td className="px-3 py-4">
                      <div
                        className="font-semibold text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline"
                        onClick={() => handleClientClick(payment)}
                        title="Click to view client payment details"
                      >
                        {payment.clientName}
                      </div>
                    </td>

                    {/* Area Column */}
                    <td className="px-3 py-4">
                      <span className="text-slate-600 dark:text-gray-300">
                        {payment.area || "-"}
                      </span>
                    </td>

                    {/* Total Amount Column */}
                    <td className="px-3 py-4">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        Rs {(payment.totalAmount || 0).toLocaleString("en-PK")}
                      </span>
                    </td>

                    {/* Total Paid Column */}
                    <td className="px-3 py-4">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Rs {(payment.totalPaid || 0).toLocaleString("en-PK")}
                      </span>
                    </td>

                    {/* Remaining Amount Column */}
                    <td className="px-3 py-4">
                      <span className={`font-semibold ${
                        (payment.remainingAmount || 0) > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Rs {(payment.remainingAmount || 0).toLocaleString("en-PK")}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-slate-600 dark:text-gray-300">
                      {new Date(payment.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-4">
                      <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full font-medium">
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Rs {payment.amount.toLocaleString("en-PK")}
                      </span>
                    </td>
                    <td className="px-3 py-4">
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
                          className="p-2 text-rose-600 hover:bg-rose-500 dark:hover:bg-rose-900/20 rounded-lg transition-colors group/btn"
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
                  {/* TOTAL COLUMNS  */}
                  <td colSpan={9} className="px-3 py-16 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-gray-500">
                      <div className="p-4 bg-slate-100 dark:bg-gray-800 rounded-full">
                        <CreditCard className="w-12 h-12 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">
                          No payments found
                        </p>
                        <p className="text-sm mt-1">
                          {searchTerm
                            ? `No results for "${searchTerm}"`
                            : "Get started by adding your first payment"}
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
          router={router}
          submitting={savingPayment}
        />
      )}

      {/* Client Details Modal */}
      {selectedClientDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {selectedClientDetails.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                      Client Payment Details
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      Complete payment breakdown
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedClientDetails(null);
                    setFullClientDetails(null);
                  }}
                  className="p-2 hover:bg-white/60 dark:hover:bg-gray-700/60 rounded-xl transition-colors text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              {clientDetailsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-4 text-slate-500 dark:text-gray-400">Loading client details...</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Client Information Section */}
                  <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl p-5 border border-slate-200 dark:border-gray-600">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Client Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Full Name</p>
                        <p className="text-base font-semibold text-slate-800 dark:text-white">{fullClientDetails?.name || selectedClientDetails.clientName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Username</p>
                        <p className="text-base font-mono font-semibold text-slate-800 dark:text-white">{fullClientDetails?.username || selectedClientDetails.clientUsername || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Phone</p>
                        <p className="text-base font-semibold text-slate-800 dark:text-white">{fullClientDetails?.phone || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Email</p>
                        <p className="text-base font-semibold text-slate-800 dark:text-white">{fullClientDetails?.email || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">CNIC</p>
                        <p className="text-base font-mono font-semibold text-slate-800 dark:text-white">{fullClientDetails?.cnic || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">City</p>
                        <p className="text-base font-semibold text-slate-800 dark:text-white">{fullClientDetails?.city || selectedClientDetails.area || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Package</p>
                        <p className="text-base font-semibold text-slate-800 dark:text-white">{fullClientDetails?.package?.name || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Status</p>
                        <p className="text-base font-semibold">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
                            fullClientDetails?.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : fullClientDetails?.status === 'expired'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              fullClientDetails?.status === 'active' ? 'bg-green-600' : 
                              fullClientDetails?.status === 'expired' ? 'bg-red-600' : 'bg-yellow-600'
                            }`}></span>
                            {fullClientDetails?.status || 'N/A'}
                          </span>
                        </p>
                      </div>
                      {fullClientDetails?.startDate && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Start Date</p>
                          <p className="text-base font-semibold text-slate-800 dark:text-white">
                            {new Date(fullClientDetails.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      )}
                      {fullClientDetails?.expiryDate && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Expiry Date</p>
                          <p className="text-base font-semibold text-slate-800 dark:text-white">
                            {new Date(fullClientDetails.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Summary Section */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Payment Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Amount</p>
                        </div>
                        <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                          Rs {(fullClientDetails?.totalAmount || selectedClientDetails.totalAmount || 0).toLocaleString("en-PK")}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Package + Charges</p>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Paid</p>
                        </div>
                        <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                          Rs {(fullClientDetails?.totalPaid || selectedClientDetails.totalPaid || 0).toLocaleString("en-PK")}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">All Payments</p>
                      </div>

                      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border ${
                        (fullClientDetails?.remainingAmount || selectedClientDetails.remainingAmount || 0) > 0
                          ? 'border-rose-100 dark:border-rose-900'
                          : 'border-emerald-100 dark:border-emerald-900'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <svg className={`w-5 h-5 ${
                            (fullClientDetails?.remainingAmount || selectedClientDetails.remainingAmount || 0) > 0
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                              (fullClientDetails?.remainingAmount || selectedClientDetails.remainingAmount || 0) > 0
                                ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            } />
                          </svg>
                          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                            {(fullClientDetails?.remainingAmount || selectedClientDetails.remainingAmount || 0) > 0 ? 'Remaining' : 'Status'}
                          </p>
                        </div>
                        <p className={`text-3xl font-bold ${
                          (fullClientDetails?.remainingAmount || selectedClientDetails.remainingAmount || 0) > 0
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-emerald-700 dark:text-emerald-300'
                        }`}>
                          Rs {(fullClientDetails?.remainingAmount || selectedClientDetails.remainingAmount || 0).toLocaleString("en-PK")}
                        </p>
                        {(fullClientDetails?.remainingAmount || selectedClientDetails.remainingAmount || 0) <= 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">✅ Fully Paid</p>
                        )}
                        {(fullClientDetails?.remainingAmount || selectedClientDetails.remainingAmount || 0) > 0 && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Outstanding</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {fullClientDetails && (
                    <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl p-5 border border-slate-200 dark:border-gray-600">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Additional Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Package Amount</p>
                          <p className="text-lg font-semibold text-slate-800 dark:text-white">
                            Rs {(fullClientDetails.packageAmount || fullClientDetails.price || 0).toLocaleString("en-PK")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Additional Charges</p>
                          <p className="text-lg font-semibold text-slate-800 dark:text-white">
                            Rs {((fullClientDetails.additionalCharges || 0)).toLocaleString("en-PK")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Product Sales (Unpaid)</p>
                          <p className="text-lg font-semibold text-slate-800 dark:text-white">
                            Rs {(fullClientDetails.otherIncome || 0).toLocaleString("en-PK")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">Overpaid Amount</p>
                          <p className="text-lg font-semibold text-slate-800 dark:text-white">
                            Rs {(fullClientDetails.overpaidAmount || 0).toLocaleString("en-PK")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedClientDetails(null);
                    setFullClientDetails(null);
                    router.push(`/dashboard/clients/${selectedClientDetails.clientId}`);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Full Profile
                </button>
                <button
                  onClick={() => {
                    setSelectedClientDetails(null);
                    setFullClientDetails(null);
                    router.push(`/dashboard/clients/${selectedClientDetails.clientId}/invoice`);
                  }}
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Invoices
                </button>
                <button
                  onClick={() => {
                    // Pre-fill payment form for this client
                    setEditingPayment(selectedClientDetails);
                    setShowForm(true);
                    setSelectedClientDetails(null);
                    setFullClientDetails(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Clients Modal */}
      {showPendingClients && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Pending Recovery Details
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Clients with outstanding balances
                </p>
              </div>
              <button
                onClick={() => setShowPendingClients(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {pendingClientsList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                    <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">All Clear!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No pending recoveries</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingClientsList.map((client, index) => (
                    <div
                      key={client.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold">
                              {index + 1}
                            </span>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {client.name}
                            </h3>
                          </div>
                          {client.phone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
                              📞 {client.phone}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            Rs {client.remaining.toLocaleString('en-PK')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Pending
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Total Amount</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Rs {client.totalAmount.toLocaleString('en-PK')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Total Paid</p>
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            Rs {client.totalPaid.toLocaleString('en-PK')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            setShowPendingClients(false);
                            router.push(`/dashboard/clients/${client.id}/invoice`);
                          }}
                          className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                        >
                          View Invoice
                        </button>
                        <button
                          onClick={() => {
                            setShowPendingClients(false);
                            const paymentData: Payment = {
                              id: '',
                              clientName: client.name,
                              clientId: client.id,
                              amount: client.remaining,
                              date: new Date().toISOString().split('T')[0],
                              method: 'Cash',
                              totalAmount: client.totalAmount,
                              totalPaid: client.totalPaid,
                              remainingAmount: client.remaining,
                            };
                            setEditingPayment(paymentData);
                            setShowForm(true);
                          }}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Add Payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pendingClientsList.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Total Pending ({pendingClientsList.length} clients)
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    Rs {pendingRecovery.toLocaleString('en-PK')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Payment Form Modal Component
function PaymentFormModal({
  payment,
  onClose,
  onSave,
  paymentMethods,
  router,
  submitting: externalSubmitting = false,
}: {
  payment: Payment | null;
  onClose: () => void;
  onSave: (data: Partial<Payment>) => void;
  paymentMethods: string[];
  router: ReturnType<typeof useRouter>;
  submitting?: boolean;
}) {
  const [formData, setFormData] = useState({
    clientName: payment?.clientName || "",
    clientId: payment?.clientId || "",
    invoiceId: payment?.invoiceId || "",
    amount: payment?.amount || 0,
    date: payment?.date || new Date().toISOString().split("T")[0],
    method: payment?.method || paymentMethods[0],
  });

  const [clients, setClients] = useState<{ id: string; name: string; packageName: string; packagePrice: number }[]>([]);
  const [invoices, setInvoices] = useState<Array<{ id: string; invoiceNumber?: string | null; amount: number; status: string; totalAmount: number; totalPaid: number; remainingAmount: number; billingMonth: string | null; effectivePaymentStatus?: 'unpaid' | 'partial' | 'paid'; items?: Array<{ id: string; name: string; amount: number; quantity?: number; type?: string }> }>>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [clientPaymentSummary, setClientPaymentSummary] = useState<{
    totalAmount: number;
    remainingAmount: number;
    packageAmount: number;
    otherIncome: number;
    isLoading: boolean;
  }>({ totalAmount: 0, remainingAmount: 0, packageAmount: 0, otherIncome: 0, isLoading: false });
  
  // State for product sales breakdown
  const [productSales, setProductSales] = useState<
    Array<{ id: string; productName: string; sellingPrice: number; quantity: number; totalOtherIncome: number; notes?: string }>
  >([]);
  const [productSalesLoading, setProductSalesLoading] = useState(false);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients?limit=500", {
          credentials: 'include', // This ensures cookies are sent with the request
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Handle both paginated and non-paginated responses
          const clientsList = data.clients || data;
          
          // Map clients to id/name pairs with package details
          const clientOptions = clientsList.map((client: any) => {
            // Use plain client name without contact info
            const displayName = client.name;

            // Include package information in the display
            const packageName = client.package?.name || 'No Package';
            const packagePrice = client.price || 0;

            return {
              id: client.id,
              name: displayName,
              phone: client.phone,
              email: client.email,
              packageName: packageName,
              packagePrice: packagePrice,
            };
          });
          setClients(clientOptions);

          // If editing, set the correct client
          if (payment) {
            const matchedClient = clientOptions.find(
              (c: { id: string }) => c.id === payment.clientId,
            );
            if (matchedClient) {
              setFormData((prev) => ({
                ...prev,
                clientName: matchedClient.name,
                clientId: matchedClient.id,
              }));
            }
          }
        } else if (response.status === 401) {
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        router.push("/login"); // Redirect to login on error
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [payment]);

  const handleChange = async (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "clientName") {
      // Find the corresponding client ID when client name is selected
      const selectedClient = clients.find((client) => client.name === value);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        clientId: selectedClient ? selectedClient.id : "",
        invoiceId: "", // Reset invoice when client changes
        amount: 0, // Reset amount
      }));

      // Fetch client payment summary and invoices when client is selected
      if (selectedClient) {
        setClientPaymentSummary(prev => ({ ...prev, isLoading: true }));
        setProductSalesLoading(true);
        setLoadingInvoices(true);
        try {
          // Fetch client data with payment summary (light mode for speed)
          const response = await fetch(`/api/clients/${selectedClient.id}?light=true`, {
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
            },
          });

          // Fetch invoices for this client
          const invoicesRes = await fetch(`/api/invoices?clientId=${selectedClient.id}`, {
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
            },
          });

          // Fetch product sales for this client
          const productSalesRes = await fetch(`/api/product-sales?clientId=${selectedClient.id}`, {
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const clientData = await response.json();
            setClientPaymentSummary({
              totalAmount: clientData.totalAmount || clientData.total || 0,
              remainingAmount: clientData.remainingAmount || 0,
              packageAmount: clientData.packageAmount || 0,
              otherIncome: clientData.otherIncome || 0,
              isLoading: false,
            });

            // Set product sales data
            if (productSalesRes.ok) {
              const salesData = await productSalesRes.json();
              if (salesData.data && Array.isArray(salesData.data)) {
                setProductSales(salesData.data);
              }
            }

            // Set invoices (only unpaid/partial) - keep full data including items
            if (invoicesRes.ok) {
              const invoicesData = await invoicesRes.json();
              console.log(`[Payment Form] Client ${selectedClient.id} has ${invoicesData.length} total invoices`);
              
              // Keep all invoice data including items for package extraction
              const unpaidInvoices = invoicesData.filter((inv: any) =>
                inv.effectivePaymentStatus === 'unpaid' || inv.effectivePaymentStatus === 'partial'
              );
              console.log(`[Payment Form] Showing ${unpaidInvoices.length} unpaid/partial invoices`);
              setInvoices(unpaidInvoices);
            }
          } else {
            setClientPaymentSummary(prev => ({ ...prev, isLoading: false }));
          }
        } catch (error) {
          console.error("Error fetching client payment summary:", error);
          setClientPaymentSummary(prev => ({ ...prev, isLoading: false }));
        } finally {
          setProductSalesLoading(false);
          setLoadingInvoices(false);
        }
      } else {
        setClientPaymentSummary({ totalAmount: 0, remainingAmount: 0, packageAmount: 0, otherIncome: 0, isLoading: false });
        setProductSales([]);
        setInvoices([]);
      }
    } else if (name === "invoiceId") {
      // When invoice is selected, auto-fill the remaining amount and update summary
      const selectedInvoice = invoices.find(inv => inv.id === value);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        amount: selectedInvoice ? selectedInvoice.remainingAmount : prev.amount,
      }));

      // ✅ Update Client Payment Summary to show selected invoice details
      if (selectedInvoice) {
        // Extract package amount from items array
        const packageItem = selectedInvoice.items?.find((item: any) => item.type === 'package');
        let packageAmount = packageItem ? (packageItem.amount || 0) * (packageItem.quantity || 1) : 0;
        
        // Fallback to client package price if not found in invoice items
        if (packageAmount === 0 && clientPaymentSummary.packageAmount > 0) {
          packageAmount = clientPaymentSummary.packageAmount;
        }
        
        // Calculate total from items (handles discounts, add-ons, carry forward)
        const totalAmount = selectedInvoice.items?.reduce((sum: number, item: any) => {
          if (item.type === 'discount') {
            return sum - ((item.amount || 0) * (item.quantity || 1));
          }
          return sum + ((item.amount || 0) * (item.quantity || 1));
        }, 0) || selectedInvoice.totalAmount || 0;

        setClientPaymentSummary({
          totalAmount,
          remainingAmount: selectedInvoice.remainingAmount || 0,
          packageAmount,
          otherIncome: 0, // Product sales shown separately below
          isLoading: false,
        });
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "amount" ? Number(value) : value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Remove notes field from form data before saving
    const { clientName, ...paymentData } = formData;
    onSave(paymentData);
  };

  if (loadingClients) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {payment ? "Edit Payment" : "Add New Payment"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200/80 dark:border-gray-700/80">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {payment ? "Edit Payment" : "Add New Payment"}
              </h2>
              <p className="text-xs text-blue-100 mt-1">
                {payment ? "Update payment details" : "Record a new payment from client"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white hover:scale-110"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <fieldset disabled={externalSubmitting} className="space-y-5 disabled:opacity-60">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900 dark:text-white"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name} - {client.packageName} (Rs. {client.packagePrice})
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Selection - REQUIRED */}
          {formData.clientId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Invoice <span className="text-red-500">*</span>
              </label>
              {loadingInvoices ? (
                <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              ) : invoices.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    ⚠️ No unpaid invoices found for this client. Please create an invoice first.
                  </p>
                </div>
              ) : (
                <div>
                  <select
                    name="invoiceId"
                    value={formData.invoiceId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900 dark:text-white"
                  >
                    <option value="">Select an invoice</option>
                    {invoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.billingMonth ? `Invoice #${invoice.invoiceNumber || invoice.id.slice(-8).toUpperCase()} - ${invoice.billingMonth}` : `Invoice #${invoice.invoiceNumber || invoice.id.slice(-8).toUpperCase()}`} | {invoice.effectivePaymentStatus === 'unpaid' ? 'Unpaid' : invoice.effectivePaymentStatus === 'partial' ? 'Partial' : 'PAID'} | Remaining: Rs. {(invoice.remainingAmount || 0).toLocaleString('en-PK')}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {invoices.length} unpaid/partial invoice(s) available
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Compact Payment Summary Card */}
          {formData.clientId && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 p-3 rounded-lg border border-slate-200/60 dark:border-gray-500">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                📊 Client Payment Summary
              </h3>
              {clientPaymentSummary.isLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-28"></div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Compact Grid Layout */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Package Amount */}
                    <div className="bg-white/50 dark:bg-gray-800/30 p-2 rounded">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Package</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        Rs. {(clientPaymentSummary.packageAmount || 0).toLocaleString('en-PK')}
                      </p>
                    </div>

                    {/* Total Due */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded border border-blue-200/40 dark:border-blue-700/30">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Total Due</p>
                      <p className="font-bold text-blue-700 dark:text-blue-300">
                        Rs. {(clientPaymentSummary.totalAmount || 0).toLocaleString('en-PK')}
                      </p>
                    </div>

                    {/* Total Paid */}
                    <div className="bg-green-50/50 dark:bg-green-900/10 p-2 rounded border border-green-200/40 dark:border-green-700/30">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Total Paid</p>
                      <p className="font-bold text-green-700 dark:text-green-300">
                        Rs. {(clientPaymentSummary.totalAmount - clientPaymentSummary.remainingAmount).toLocaleString('en-PK')}
                      </p>
                    </div>

                    {/* Pending Recovery */}
                    <div className={`p-2 rounded border ${
                      clientPaymentSummary.remainingAmount > 0
                        ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/40 dark:border-red-700/30'
                        : 'bg-green-50/50 dark:bg-green-900/10 border-green-200/40 dark:border-green-700/30'
                    }`}>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Pending Recovery</p>
                      <p className={`font-bold ${
                        clientPaymentSummary.remainingAmount > 0
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                        Rs. {clientPaymentSummary.remainingAmount.toLocaleString('en-PK')}
                      </p>
                    </div>
                  </div>

                  {/* Product Sales (if any) */}
                  {clientPaymentSummary.otherIncome > 0 && (
                    <div className="mt-2 bg-purple-50/50 dark:bg-purple-900/10 p-2 rounded border border-purple-200/40 dark:border-purple-700/30">
                      <div className="flex justify-between items-center text-xs">
                        <p className="text-[10px] text-gray-600 dark:text-gray-300">📦 Product Sales</p>
                        <p className="font-bold text-purple-700 dark:text-purple-300">
                          Rs. {clientPaymentSummary.otherIncome.toLocaleString('en-PK')}
                        </p>
                      </div>
                      {productSalesLoading ? (
                        <div className="animate-pulse mt-1.5 h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                      ) : productSales.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {productSales.slice(0, 2).map((sale) => (
                            <div key={sale.id} className="flex justify-between text-[10px]">
                              <span className="text-gray-600 dark:text-gray-300">
                                {sale.productName} × {sale.quantity}
                              </span>
                              <span className="font-medium text-gray-700 dark:text-gray-200">
                                Rs. {(sale.sellingPrice * sale.quantity).toLocaleString('en-PK')}
                              </span>
                            </div>
                          ))}
                          {productSales.length > 2 && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                              +{productSales.length - 2} more...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`mt-2 p-1.5 rounded text-center text-[10px] font-semibold ${
                    clientPaymentSummary.remainingAmount > 0
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  }`}>
                    {clientPaymentSummary.remainingAmount > 0 ? '⏳ Balance Due' : '✅ Paid in Full'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount and Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">
                  Rs.
                </span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-900 dark:text-white font-semibold"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              name="method"
              value={formData.method}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900 dark:text-white"
            >
              <option value="">Select payment method</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          </fieldset>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={externalSubmitting}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-semibold border-2 border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={externalSubmitting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:from-green-600 disabled:hover:to-emerald-600 flex items-center justify-center gap-2"
            >
              {externalSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                payment ? "Update Payment" : "Add Payment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add CSS animation for notifications
if (typeof document !== 'undefined') {
  const styleId = 'payment-notification-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slide-in-right {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .animate-slide-in-right {
        animation: slide-in-right 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }
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
          <div
            key={item}
            className="p-5 bg-white dark:bg-gray-800 rounded-xl border"
          >
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
