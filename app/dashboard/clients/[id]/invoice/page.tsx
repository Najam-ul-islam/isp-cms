





"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Client, Package, ServiceProvider } from "@prisma/client";
import type { InvoiceWithPayments } from "@/modules/invoices/services";
import Image from "next/image";
import PaymentModal from "@/components/payments/PaymentModal";
import InvoiceCreationDialog from "@/components/invoices/InvoiceCreationDialog";

interface ClientWithPackage extends Client {
  package: Package & { serviceProvider?: ServiceProvider | null };
  area?: { id: string; name: string; description: string | null } | null;
}

interface ExtendedClient extends Omit<
  ClientWithPackage,
  "expiryDate" | "paymentStatus"
> {
  paymentStatus?: string;
  expiryDate?: Date;
  totalPaid?: number;
  remainingAmount?: number;
  totalAmount?: number;
  effectivePaymentStatus?: "paid" | "partial" | "unpaid";
  latestPaymentDate?: Date | null;
  invoices?: InvoiceWithPayments[];
}

export default function ClientInvoicePage() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState<ExtendedClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [additionalCharges, setAdditionalCharges] = useState<
    Array<{ name: string; amount: number }>
  >([]);
  const [productSales, setProductSales] = useState<
    Array<{ id: string; productName: string; sellingPrice: number; quantity: number; totalOtherIncome: number; notes?: string }>
  >([]);
  const [showAddCharges, setShowAddCharges] = useState(false);
  const [newCharge, setNewCharge] = useState<{ name: string; amount: number | '' }>({ name: '', amount: '' });
  const [paymentSummary, setPaymentSummary] = useState({
    totalAmount: 0,
    totalPaid: 0,
    remainingAmount: 0,
  });
  const [selectedInvoiceRemaining, setSelectedInvoiceRemaining] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Consolidated data loader
  const loadClientData = async (preserveSelection = false) => {
    try {
      setLoading(true);
      const [clientRes, salesRes] = await Promise.all([
        fetch(`/api/clients/${id}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/product-sales?clientId=${id}`, { credentials: 'include', cache: 'no-store' }),
      ]);

      if (!clientRes.ok) {
        if (clientRes.status === 401) router.push('/login');
        else if (clientRes.status === 404) router.push('/dashboard/clients');
        else setError('Failed to load client data');
        return;
      }

      const data: ExtendedClient = await clientRes.json();
      setClient(data);

      // Update payment summary if preserving selection (refresh after mutation)
      if (preserveSelection && selectedInvoiceId && data.invoices) {
        const inv = data.invoices.find(i => i.id === selectedInvoiceId);
        if (inv) {
          setSelectedInvoiceRemaining(inv.remainingAmount ?? 0);
          setPaymentSummary({
            totalAmount: inv.totalAmount ?? inv.amount ?? 0,
            totalPaid:   inv.totalPaid ?? 0,
            remainingAmount: inv.remainingAmount ?? 0,
          });
        }
      }

      // Product sales
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        if (salesData.data && Array.isArray(salesData.data)) {
          setProductSales(salesData.data);
        }
      }

      // Aggregate additionalCharges from ALL invoices
      const allCharges: Array<{ name: string; amount: number }> = [];
      data.invoices?.forEach((inv) => {
        if (inv.additionalCharges) {
          try {
            const charges = typeof inv.additionalCharges === 'string'
              ? JSON.parse(inv.additionalCharges)
              : inv.additionalCharges;
            if (Array.isArray(charges)) allCharges.push(...charges);
          } catch {
            // ignore parse errors
          }
        }
      });
      setAdditionalCharges(allCharges);

      // Auto-select oldest unpaid invoice only if not preserving selection
      if (!preserveSelection && data.invoices && data.invoices.length > 0) {
        const unpaidInvoices = data.invoices
          .filter((i) => (i as any).effectivePaymentStatus !== "paid")
          .sort((a, b) => new Date(a.issuedDate ?? 0).getTime() - new Date(b.issuedDate ?? 0).getTime());

        if (unpaidInvoices.length > 0) {
          const selected = unpaidInvoices[0];
          setSelectedInvoiceId(selected.id);
          setSelectedInvoiceRemaining(selected.remainingAmount ?? 0);
          setPaymentSummary({
            totalAmount: selected.totalAmount ?? selected.amount ?? 0,
            totalPaid:   selected.totalPaid ?? 0,
            remainingAmount: selected.remainingAmount ?? 0,
          });
        } else {
          setSelectedInvoiceId('');
          setSelectedInvoiceRemaining(0);
          setPaymentSummary({ totalAmount: 0, totalPaid: 0, remainingAmount: 0 });
        }
      }
    } catch (err) {
      console.error('loadClientData error:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

   // Create Invoice Handler - Opens dialog
   const handleCreateInvoice = () => {
     setShowInvoiceDialog(true);
   };

   const handleInvoiceSuccess = async () => {
     await loadClientData(false);
   };

  useEffect(() => {
    if (id) loadClientData(false);
  }, [id]);

  // No second useEffect — removed duplicate fetch that overwrote paymentSummary

  const handleInvoiceDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const invoiceId = e.target.value;
    setSelectedInvoiceId(invoiceId);
    const inv = client?.invoices?.find(i => i.id === invoiceId);
    if (inv) {
      setSelectedInvoiceRemaining(inv.remainingAmount ?? 0);
      setPaymentSummary({
        totalAmount:     inv.totalAmount ?? inv.amount ?? 0,
        totalPaid:       inv.totalPaid ?? 0,
        remainingAmount: inv.remainingAmount ?? 0,
      });
    }
  };

   const handleAddCharge = async () => {
    if (!client) return;
    if (!newCharge.name?.trim() || newCharge.amount === '' || Number(newCharge.amount) <= 0) return;
    setShowAddCharges(false);

    const charge = {
      name: newCharge.name.trim(),
      amount: Number(newCharge.amount),
    };
    const updatedCharges = [...additionalCharges, charge];
    setAdditionalCharges(updatedCharges);
    setNewCharge({ name: '', amount: '' });

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId: client.id,
          items: [{
            name: charge.name,
            amount: charge.amount,
            quantity: 1,
          }],
          description: `Additional charge: ${charge.name}`,
          appendToExisting: true,
        }),
      });

      if (!response.ok) {
        setAdditionalCharges(additionalCharges); // rollback
        const error = await response.json();
        console.error('Failed to add charge:', error);
      } else {
        loadClientData(true); // preserve the current invoice selection
      }
    } catch (error) {
      setAdditionalCharges(additionalCharges);
      console.error('Error saving additional charge:', error);
    }
  };

  const handleRemoveCharge = async (index: number) => {
    if (!client) return;
    const updated = additionalCharges.filter((_, i) => i !== index);
    setAdditionalCharges(updated); // optimistic

    try {
      const response = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientId: client.id, additionalCharges: updated }),
      });

      if (!response.ok) {
        setAdditionalCharges(additionalCharges); // rollback
        const error = await response.json();
        console.error('Failed to remove charge:', error);
      } else {
        loadClientData(true);
      }
    } catch (error) {
      setAdditionalCharges(additionalCharges);
      console.error('Error removing charge:', error);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setSelectedInvoiceId('');
    setSelectedInvoiceRemaining(0);
    setPaymentSummary({ totalAmount: 0, totalPaid: 0, remainingAmount: 0 });
    setRefreshing(true);
    await loadClientData(false);
  };

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPKR = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);

  if (loading || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {refreshing ? 'Refreshing...' : 'Loading...'}
      </div>
    );
  }

  // Calculate values dynamically from client data
   const packagePrice = client.price ?? 0;

   const hasExistingInvoices = client.invoices && Array.isArray(client.invoices) && client.invoices.length > 0;
   const shouldIncludePackage = !hasExistingInvoices;

   // Use aggregated charges from state
   const currentCharges = additionalCharges;
   const additionalTotal = currentCharges.reduce((sum, c) => sum + (c.amount ?? 0), 0);

  const productSalesTotal = productSales.reduce((sum, sale) => sum + (sale.sellingPrice * sale.quantity), 0);
  const localTotal = (shouldIncludePackage ? packagePrice : 0) + additionalTotal + productSalesTotal;
  const total = paymentSummary.totalAmount > 0 ? paymentSummary.totalAmount : localTotal;
  const paid = paymentSummary.totalPaid;
  const remaining = paymentSummary.remainingAmount;

  // Derive selected invoice object
  const selectedInvoice = client?.invoices?.find(inv => inv.id === selectedInvoiceId);

  // Status calculation
  let effectiveStatus: string;
  let statusColor: string;

  if (remaining < -0.01) {
    effectiveStatus = "OVERPAID";
    statusColor = "text-blue-600 bg-blue-100";
  } else if (remaining <= 0.01) {
    effectiveStatus = "PAID";
    statusColor = "text-green-600 bg-green-100";
  } else if (paid > 0) {
    effectiveStatus = "PARTIAL";
    statusColor = "text-yellow-600 bg-yellow-100";
  } else {
    effectiveStatus = "UNPAID";
    statusColor = "text-red-600 bg-red-100";
  }

  const sendWhatsApp = () => {
    const phone = client.phone.replace(/\D/g, "");
    const selectedInv = client.invoices?.find(i => i.id === selectedInvoiceId);
    const msgTotal     = selectedInv ? (selectedInv.totalAmount ?? selectedInv.amount ?? total) : total;
    const msgPaid      = selectedInv?.totalPaid ?? paid;
    const msgRemaining = selectedInv?.remainingAmount ?? remaining;

    const message = `
📄 *Package Invoice*
INV ${selectedInv?.invoiceNumber ? `#${selectedInv.invoiceNumber}` : selectedInvoiceId ? `#${selectedInvoiceId.slice(-8).toUpperCase()}` : ''}
Date: ${formatDate(new Date())}

👤 *Client Details*
Name: ${client.name}
Phone: ${client.phone}
Address: ${client.area?.name ?? client.areaName ?? 'N/A'}, ${client.city ?? 'N/A'}

📦 *Package Detail*
Package: ${client.package?.name ?? 'N/A'}
Duration: 1 Month

💰 *Payment Detail*
${shouldIncludePackage ? `Package Charges: ${formatPKR(packagePrice)}\n` : ''}One-Time Charges: ${formatPKR(additionalTotal)}
Subtotal: ${formatPKR(msgTotal)}
Discount: ${formatPKR(0)}
Grand Total: ${formatPKR(msgTotal)}

💳 *Payment Status*
Paid Amount: ${formatPKR(msgPaid)}
Remaining Amount: ${formatPKR(msgRemaining)}

Last Payment: ${client.latestPaymentDate ? formatDate(client.latestPaymentDate) : "N/A"}
Expiry Date: ${formatDate(client.expiryDate ?? new Date())}
Status: ${remaining <= 0.01 ? "✅ PAID" : paid > 0 ? "⏳ PARTIAL" : "❌ UNPAID"}

Please clear your dues. Thank you!
`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-blue-50 flex flex-col items-center justify-center p-4 gap-3">
      {/* Refreshing overlay */}
      {refreshing && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-sm mt-2">Updating...</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={handleCreateInvoice}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/60 dark:border-blue-400/60 px-4 py-2 text-sm font-semibold text-white bg-blue-600 dark:bg-blue-500 transition-all duration-200 ease-out hover:border-blue-400/60 dark:hover:border-blue-300/60 hover:bg-blue-700 dark:hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Create Invoice
        </button>
        <button
          onClick={sendWhatsApp}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 dark:border-emerald-400/60 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 dark:bg-emerald-500 transition-all duration-200 ease-out hover:border-emerald-400/60 dark:hover:border-emerald-300/60 hover:bg-emerald-700 dark:hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 dark:hover:shadow-emerald-400/20 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          WhatsApp
        </button>
        {remaining > 0.01 && (
          <div className="space-y-2">
            {/* Invoice Selection Dropdown */}
            {client.invoices && client.invoices.length > 0 && (
                  <select
                    value={selectedInvoiceId}
                    onChange={handleInvoiceDropdownChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer text-gray-900 dark:text-white"
                  >
                    <option value="">Select an invoice</option>
                    {client.invoices
                      ?.filter((i) => (i as any).effectivePaymentStatus !== "paid")
                      .map((inv: any) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.billingMonth ? `${inv.billingMonth} - ` : ''}Invoice #{inv.invoiceNumber || inv.id.slice(-6).toUpperCase()} | Remaining: Rs. {inv.remainingAmount.toLocaleString()} | {inv.effectivePaymentStatus}
                        </option>
                      ))
                    }
                  </select>
            )}
            
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={!selectedInvoiceId || selectedInvoiceRemaining <= 0}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-500/60 dark:border-violet-400/60 px-4 py-2 text-sm font-semibold text-white bg-violet-600 dark:bg-violet-500 transition-all duration-200 ease-out hover:border-violet-400/60 dark:hover:border-violet-300/60 hover:bg-violet-700 dark:hover:violet-400 hover:shadow-lg hover:shadow-violet-500/20 dark:hover:shadow-violet-400/20 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
Pay Now
            </button>
          </div>
        )}
      </div>

      {/* Invoice Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 relative overflow-hidden">
        {/* Decorative Top Edge */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-linear-to-r from-indigo-500 via-purple-500 to-blue-500" />

        {/* Header */}
        <div className="text-center pt-6 pb-4 px-6">
          <h1 className="text-2xl font-bold text-indigo-700">
            Package Invoice
          </h1>
           <p className="text-sm text-slate-600 mt-1 font-medium">
              INV {selectedInvoice?.invoiceNumber ? `#${selectedInvoice.invoiceNumber}` : selectedInvoiceId ? `#${selectedInvoiceId.slice(-8).toUpperCase()}` : ''}
           </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
            {formatDate(new Date())}
          </div>
        </div>

        {/* User Info & Logo */}
        <div className="px-6 pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">
                {client.name}
              </h2>
              <p className="text-sm text-indigo-600 font-medium">
                {client.phone}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {client.area?.name || client.areaName || 'N/A'}, {client.city}
              </p>
            </div>
            <div className="ml-4">
              <Image
                src="/logo.png"
                alt="Transworld"
                width={60}
                height={60}
                className="object-contain w-auto h-auto"
              />
              {/* <p className="text-xs text-center text-slate-600 mt-1 font-medium">SNS</p> */}
            </div>
          </div>
        </div>

        {/* User Detail Section */}
        <div className="px-6 py-2 bg-blue-50 border-y border-blue-100">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            User Detail
          </p>
        </div>
        <div className="px-6 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Username</span>
            <span className="text-slate-800 font-medium">{client.name}</span>
          </div>
        </div>

        {/* Package Detail Section */}
        <div className="px-6 py-2 bg-blue-50 border-y border-blue-100 mt-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Package Detail
          </p>
        </div>
        <div className="px-6 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Internet Package</span>
            <span className="text-slate-800 font-medium">
              {client.package?.name}
            </span>
          </div>
        </div>

        {/* One-Time Charges Section - Only for adding/editing */}
        <div className="px-6 py-2 mt-0.5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200">
              🔧 One-Time Charges
            </p>
            <button
              onClick={() => setShowAddCharges(!showAddCharges)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              {showAddCharges ? "Cancel" : "+ Add Charge"}
            </button>
          </div>

          {showAddCharges && (
            <div className="bg-slate-50 rounded-lg p-2 mb-2 space-y-2 border border-slate-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newCharge.name}
                  onChange={(e) =>
                    setNewCharge({ ...newCharge, name: e.target.value })
                  }
                  className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  value={newCharge.amount}
                  onChange={(e) =>
                    setNewCharge({ ...newCharge, amount: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                  className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                />
                <button
                  onClick={handleAddCharge}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Show count of charges if any exist */}
          {currentCharges.length > 0 && (
            <div className="text-xs text-slate-500 italic">
              {currentCharges.length} charge
              {currentCharges.length > 1 ? "s" : ""} added
            </div>
          )}
        </div>

        {/* Outstanding Invoices Section */}
        {paymentSummary.totalAmount > localTotal && localTotal > 0 && (
          <div className="px-6 py-2 bg-amber-50 border-y border-amber-100 mt-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              📋 Outstanding Invoices
            </p>
            <p className="text-xs text-amber-600">
              Total outstanding (invoices + product sales): {formatPKR(paymentSummary.totalAmount)}
            </p>
            <p className="text-xs text-amber-500 mt-1">
              This page shows: {formatPKR(localTotal)} (product sales + charges)
            </p>
          </div>
        )}

        {/* Payment Detail Section - Show ALL charges here */}
        <div className="px-6 py-2 bg-blue-50 border-y border-blue-100 mt-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Payment Detail
          </p>
        </div>
        <div className="px-6 py-3 space-y-2">
          {/* Internet/Package Charges - ONLY for NEW clients */}
          {shouldIncludePackage && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Internet Charges</span>
              <span className="text-slate-800 text-xs leading-tight">
                {formatPKR(packagePrice)}
              </span>
            </div>
          )}

          {/* One-Time Charges listed individually */}
          {currentCharges.map((charge, idx) => (
            <div key={idx} className="flex justify-between items-center py-0.5">
              <span className="text-slate-600 text-xs leading-tight">
                {charge.name}
              </span>
              <span className="text-slate-800 font-normal text-xs leading-tight">
                {formatPKR(charge.amount)}
              </span>
            </div>
          ))}

          {/* Product Sales / Other Income */}
          {productSales.length > 0 && (
            <>
              <div className="flex justify-between items-center py-2 mt-2 border-t border-slate-200">
                <span className="text-slate-700 font-semibold text-sm">Product Sales</span>
              </div>
              {productSales.map((sale) => (
                <div key={sale.id} className="flex justify-between items-start py-0.5 pl-2">
                  <div className="flex-1 pr-2">
                    <span className="text-slate-600 text-xs leading-tight font-medium">
                      {sale.productName}
                    </span>
                    <span className="text-slate-500 text-[10px] leading-tight ml-1">
                      × {sale.quantity} @ {formatPKR(sale.sellingPrice)}/unit
                    </span>
                    {sale.notes && (
                      <span className="block text-[10px] text-slate-500 leading-tight mt-0.5">
                        {sale.notes}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-800 font-semibold text-xs leading-tight whitespace-nowrap">
                    {formatPKR(sale.sellingPrice * sale.quantity)}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Subtotal */}
          {currentCharges.length > 0 && (
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-800 font-medium">
                {formatPKR(total)}
              </span>
            </div>
          )}

          {/* Discount */}
          {/* <div className="flex justify-between text-sm">
            <span className="text-slate-600">Discount</span>
            <span className="text-red-600 font-medium">-{formatPKR(0)}</span>
          </div> */}
        </div>

        {/* Total Amount Box */}
        <div className="mx-6 mb-4 mt-1 bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-slate-700">
              Total
            </span>
            <span className="text-2xl font-bold text-indigo-700">
              {formatPKR(total)}
            </span>
          </div>
          {/* {paymentSummary.totalAmount > localTotal && (
            <p className="text-xs text-slate-500 mt-2">
              Includes {formatPKR(paymentSummary.totalAmount - localTotal)} from unpaid invoices + {formatPKR(localTotal)} from this page
            </p>
          )} */}
        </div>

        {/* Payment Status Section */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Paid Amount</span>
            <span className="text-green-600 font-semibold">
              {formatPKR(paid)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Remaining Amount</span>
            <span
              className={`font-semibold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {formatPKR(remaining)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
            <span className="text-slate-600">Status</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}
            >
              {effectiveStatus}
            </span>
          </div>
        </div>

        {/* Decorative Bottom Edge */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-linear-to-r from-indigo-500 via-purple-500 to-blue-500" />
      </div>

      {/* Payment Modal */}
      {client && selectedInvoiceRemaining > 0 && showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentSuccess}
          amount={selectedInvoiceRemaining}
          title={`Invoice for ${client.name}`}
          description={`Payment for ${client.name}`}
          metadata={{
            referenceType: "invoice",
            referenceId: selectedInvoiceId ?? client.invoices?.[0]?.id ?? client.id,
            clientId: client.id,
            invoiceId: selectedInvoiceId ?? client.invoices?.[0]?.id ?? "",
          }}
          additionalCharges={
            additionalCharges.length > 0 ? additionalCharges : undefined
          }
        />
      )}

      {/* Invoice Creation Dialog */}
      {client && (
        <InvoiceCreationDialog
          isOpen={showInvoiceDialog}
          onClose={() => setShowInvoiceDialog(false)}
          clientId={client.id}
          clientName={client.name}
          packageName={client.package?.name}
          packagePrice={client.price}
          outstandingAmount={paymentSummary.remainingAmount}
          onSuccess={handleInvoiceSuccess}
        />
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          button {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}