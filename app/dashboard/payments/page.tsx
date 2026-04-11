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
} from "lucide-react";

interface Payment {
  id: string;
  clientName: string;
  clientUsername?: string;
  clientId: string;
  area?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [selectedClientDetails, setSelectedClientDetails] = useState<Payment | null>(null);

  const router = useRouter();

  const paymentMethods = [
    "Cash",
    "Bank Transfer",
    "Online",
    "Credit Card",
    "Debit Card",
    "Mobile Payment",
  ];

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

          // Total amount is based on the client's package price
          const totalAmount = p.client?.price || 0;

          return {
            id: p.id,
            clientName,
            clientUsername: p.client?.username || undefined,
            clientId: p.clientId,
            area: p.client?.area || "-",
            amount: p.amount,
            date: p.paymentDate,
            method: p.method || "Cash",
            notes: p.notes || "",
            totalAmount,
            totalPaid: p.totalPaid || 0,
            remainingAmount: p.remainingAmount || 0,
          };
        });
        
        if (isMounted.current) {
          setPayments(mappedPayments);
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
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          alert("Failed to delete payment");
        }
      } catch (error) {
        console.error("Error deleting payment:", error);
        router.push("/login"); // Redirect to login on error
      }
    }
  };

  const handleSavePayment = async (paymentData: Partial<Payment>) => {
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

          // Total amount is based on the client's package price
          const totalAmount = updatedPayment.client?.price || 0;

          const mappedPayment = {
            id: updatedPayment.id,
            clientName,
            clientId: updatedPayment.clientId,
            area: updatedPayment.client?.area || "-",
            amount: updatedPayment.amount,
            date: updatedPayment.paymentDate,
            method: updatedPayment.method || "Cash",
            notes: updatedPayment.notes || "",
            totalAmount,
            totalPaid: updatedPayment.totalPaid || 0,
            remainingAmount: updatedPayment.remainingAmount || 0,
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
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          alert("Failed to update payment");
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

          // Total amount is based on the client's package price
          const totalAmount = newPayment.client?.price || 0;

          const mappedNewPayment = {
            id: newPayment.id,
            clientName,
            clientId: newPayment.clientId,
            area: newPayment.client?.area || "-",
            amount: newPayment.amount,
            date: newPayment.paymentDate,
            method: newPayment.method || "Cash",
            notes: newPayment.notes || "",
            totalAmount,
            totalPaid: newPayment.totalPaid || 0,
            remainingAmount: newPayment.remainingAmount || 0,
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
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          alert("Failed to add payment");
        }

      }
    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Failed to save payment");
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
          <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
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
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
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
                        onClick={() => setSelectedClientDetails(payment)}
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
        />
      )}

      {/* Client Details Modal */}
      {selectedClientDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Client Payment Details
              </h2>
              <button
                onClick={() => setSelectedClientDetails(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-800 mb-2">{selectedClientDetails.clientName}</h3>
                {selectedClientDetails.area && selectedClientDetails.area !== "-" && (
                  <p className="text-gray-600 text-sm">Area: {selectedClientDetails.area}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <p className="text-sm text-indigo-600 font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-indigo-800">
                    Rs {(selectedClientDetails.totalAmount || 0).toLocaleString("en-PK")}
                  </p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-sm text-emerald-600 font-medium">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-800">
                    Rs {(selectedClientDetails.totalPaid || 0).toLocaleString("en-PK")}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${
                  (selectedClientDetails.remainingAmount || 0) > 0
                    ? 'bg-rose-50 border-rose-100'
                    : 'bg-emerald-50 border-emerald-100'
                }`}>
                  <p className="text-sm font-medium mb-1">
                    {selectedClientDetails.remainingAmount && (selectedClientDetails.remainingAmount || 0) > 0
                      ? 'Remaining Amount'
                      : 'Payment Status'}
                  </p>
                  <p className={`text-2xl font-bold ${
                    (selectedClientDetails.remainingAmount || 0) > 0
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }`}>
                    Rs {(selectedClientDetails.remainingAmount || 0).toLocaleString("en-PK")}
                  </p>
                  {selectedClientDetails.remainingAmount && (selectedClientDetails.remainingAmount || 0) <= 0 && (
                    <p className="text-emerald-600 text-sm mt-1">✅ Fully Paid</p>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    // Pre-fill payment form for this client
                    setEditingPayment(selectedClientDetails);
                    setShowForm(true);
                    setSelectedClientDetails(null);
                  }}
                  className="w-full px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                >
                  Add Payment
                </button>
              </div>
            </div>
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
}: {
  payment: Payment | null;
  onClose: () => void;
  onSave: (data: Partial<Payment>) => void;
  paymentMethods: string[];
  router: ReturnType<typeof useRouter>;
}) {
  const [formData, setFormData] = useState({
    clientName: payment?.clientName || "",
    clientId: payment?.clientId || "",
    amount: payment?.amount || 0,
    date: payment?.date || new Date().toISOString().split("T")[0],
    method: payment?.method || paymentMethods[0],
  });

  const [clients, setClients] = useState<{ id: string; name: string; packageName: string; packagePrice: number }[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        const response = await fetch("/api/clients", {
          credentials: 'include', // This ensures cookies are sent with the request
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Map clients to id/name pairs with package details
          const clientOptions = data.map((client: any) => {
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
        // Auto-fill amount based on client's remaining amount
        amount: selectedClient ? selectedClient.packagePrice : prev.amount,
      }));

      // Fetch client payment summary when client is selected
      if (selectedClient) {
        setClientPaymentSummary(prev => ({ ...prev, isLoading: true }));
        setProductSalesLoading(true);
        try {
          // Fetch client data with payment summary
          const response = await fetch(`/api/clients/${selectedClient.id}`, {
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
          } else {
            setClientPaymentSummary(prev => ({ ...prev, isLoading: false }));
          }
        } catch (error) {
          console.error("Error fetching client payment summary:", error);
          setClientPaymentSummary(prev => ({ ...prev, isLoading: false }));
        } finally {
          setProductSalesLoading(false);
        }
      } else {
        setClientPaymentSummary({ totalAmount: 0, remainingAmount: 0, packageAmount: 0, otherIncome: 0, isLoading: false });
        setProductSales([]);
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
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 rounded-t-2xl">
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

          {/* Payment Summary Card */}
          {formData.clientId && (
            <div className="bg-linear-to-br from-slate-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 p-5 rounded-xl border border-slate-200/60 dark:border-gray-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Client Payment Summary
                </h3>
              </div>
              {clientPaymentSummary.isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-28"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Package Amount */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-gray-500">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Package Amount</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">
                      Rs. {clientPaymentSummary.packageAmount.toLocaleString('en-PK')}
                    </p>
                  </div>
                  
                  {/* Other Income (Product Sales) */}
                  {clientPaymentSummary.otherIncome > 0 && (
                    <div className="pb-2 border-b border-slate-200/60 dark:border-gray-500">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Other Income (Product Sales)
                          <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-normal">Router, cable, accessories, etc.</span>
                        </p>
                        <p className="text-base font-bold text-purple-600 dark:text-purple-400">
                          Rs. {clientPaymentSummary.otherIncome.toLocaleString('en-PK')}
                        </p>
                      </div>
                      
                      {/* Product Sales Breakdown */}
                      {productSalesLoading ? (
                        <div className="animate-pulse space-y-2 ml-2">
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                        </div>
                      ) : productSales.length > 0 ? (
                        <div className="ml-2 space-y-1.5 bg-purple-50/50 dark:bg-purple-900/10 p-2 rounded-lg border border-purple-200/60 dark:border-purple-700/50">
                          <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1.5">
                            Product Sales Breakdown
                          </p>
                          {productSales.map((sale) => (
                            <div key={sale.id} className="flex justify-between items-start text-xs">
                              <div className="flex-1 pr-2">
                                <p className="text-gray-700 dark:text-gray-300 font-medium">
                                  {sale.productName} × {sale.quantity}
                                </p>
                                {sale.notes && (
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    {sale.notes}
                                  </p>
                                )}
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 font-semibold whitespace-nowrap">
                                Rs. {sale.totalOtherIncome.toLocaleString('en-PK')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  
                  {/* Total Amount */}
                  <div className="flex justify-between items-center pb-3 border-b border-blue-200/60 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total Amount</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      Rs. {clientPaymentSummary.totalAmount.toLocaleString('en-PK')}
                    </p>
                  </div>
                  
                  {/* Total Paid */}
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200/60 dark:border-gray-500">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Total Paid</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      Rs. {(clientPaymentSummary.totalAmount - clientPaymentSummary.remainingAmount).toLocaleString('en-PK')}
                    </p>
                  </div>
                  
                  {/* Remaining Amount */}
                  <div className="flex justify-between items-center pt-1">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Remaining Amount</p>
                    <p className={`text-xl font-bold ${
                      clientPaymentSummary.remainingAmount > 0
                        ? 'text-red-600 dark:text-red-400'
                        : clientPaymentSummary.remainingAmount < 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      Rs. {clientPaymentSummary.remainingAmount.toLocaleString('en-PK')}
                    </p>
                  </div>
                  {clientPaymentSummary.remainingAmount > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/60 dark:border-amber-800/50">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        💡 Client still has an outstanding balance
                      </p>
                    </div>
                  )}
                  {clientPaymentSummary.remainingAmount <= 0 && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200/60 dark:border-green-800/50">
                      <p className="text-xs text-green-700 dark:text-green-300">
                        ✅ Client has paid in full
                      </p>
                    </div>
                  )}
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-semibold border-2 border-gray-200 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              {payment ? "Update Payment" : "Add Payment"}
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
