"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Client, Package, ServiceProvider } from "@prisma/client";
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
  invoices?: Array<{
    id: string;
    additionalCharges?: string | Array<{ name: string; amount: number }>;
    items?: Array<{ name: string; description?: string; amount: number; quantity: number }>;
  }>;
}

export default function ClientInvoicePage() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState<ExtendedClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState<
    Array<{ name: string; amount: number }>
  >([]);
  const [productSales, setProductSales] = useState<
    Array<{ id: string; productName: string; sellingPrice: number; quantity: number; totalOtherIncome: number; notes?: string }>
  >([]);
  const [showAddCharges, setShowAddCharges] = useState(false);
  const [newCharge, setNewCharge] = useState({ name: "", amount: "" });
  const [paymentSummary, setPaymentSummary] = useState({
    totalAmount: 0,
    totalPaid: 0,
    remainingAmount: 0,
  });

  // Create Invoice Handler - Opens dialog
  const handleCreateInvoice = () => {
    setShowInvoiceDialog(true);
  };

  const handleInvoiceSuccess = async () => {
    // Refresh client data after invoice creation
    const res = await fetch(`/api/clients/${id}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      setClient(data);
    }
  };

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${id}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
          } else if (res.status === 404) {
            router.push("/dashboard/clients");
          } else {
            console.error("Failed to fetch client:", res.status);
            router.push("/dashboard/clients");
          }
          return;
        }

        const data = await res.json();
        
        // Check if client data is null
        if (!data || !data.id) {
          console.error("Client not found:", id);
          router.push("/dashboard/clients");
          return;
        }
        
        setClient(data);

        if (
          data.invoices &&
          data.invoices.length > 0 &&
          data.invoices[0].additionalCharges
        ) {
          try {
            const charges =
              typeof data.invoices[0].additionalCharges === "string"
                ? JSON.parse(data.invoices[0].additionalCharges)
                : data.invoices[0].additionalCharges;
            if (Array.isArray(charges)) {
              setAdditionalCharges(charges);
            }
          } catch (error) {
            console.error("Error loading additional charges:", error);
          }
        }

        // Fetch product sales for this client
        const productSalesRes = await fetch(`/api/product-sales?clientId=${id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (productSalesRes.ok) {
          const salesData = await productSalesRes.json();
          if (salesData.data && Array.isArray(salesData.data)) {
            setProductSales(salesData.data);
          }
        }
      } catch (err) {
        console.error(err);
        router.push("/dashboard/clients");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchClient();
  }, [id, router]);

  // ✅ FIX: Fetch client payment summary to get correct paid/remaining amounts
  // This uses the payment calculator which correctly tracks payments per invoice
  useEffect(() => {
    const fetchPaymentSummary = async () => {
      try {
        const res = await fetch(`/api/clients/${id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setPaymentSummary({
            totalAmount: data.totalAmount || data.total || 0,
            totalPaid: data.totalPaid || 0,
            remainingAmount: data.remainingAmount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching payment summary:", error);
      }
    };

    if (id) {
      fetchPaymentSummary();
    }
  }, [id]);

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
        Loading...
      </div>
    );
  }

  // Calculate values dynamically from client data (no hardcoded values)
  const packagePrice = client.price || 0;

  // ✅ FIX: Only include package price if this is a NEW client (no existing invoices)
  // For existing clients, package is billed separately each month
  // Additional charges and product sales are billed independently
  const hasExistingInvoices = client.invoices && Array.isArray(client.invoices) && client.invoices.length > 0;
  const shouldIncludePackage = !hasExistingInvoices; // Only include package for new clients

  // Calculate additional charges from ALL invoices
  const allAdditionalCharges: Array<{ name: string; amount: number }> = [];
  if (client.invoices && Array.isArray(client.invoices)) {
    client.invoices.forEach((invoice: any) => {
      if (invoice.additionalCharges) {
        try {
          const charges = typeof invoice.additionalCharges === 'string'
            ? JSON.parse(invoice.additionalCharges)
            : invoice.additionalCharges;
          if (Array.isArray(charges)) {
            allAdditionalCharges.push(...charges);
          }
        } catch (error) {
          console.error('Error parsing additional charges:', error);
        }
      }
    });
  }

  // Use additional charges from local state if editing, otherwise from all invoices
  const currentCharges = additionalCharges.length > 0 ? additionalCharges : allAdditionalCharges;

  const additionalTotal = currentCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

  // ⚠️ Display-only: Product sales total (for UI breakdown)
  // Note: Product sales create invoices, so this is NOT added to billing total
  // It's only shown to help users understand what's included in invoices
  const productSalesTotal = productSales.reduce((sum, sale) => sum + (sale.sellingPrice * sale.quantity), 0);

  // ✅ Display-only local total (package + additional charges + product sales)
  // This is used for UI comparison only, NOT for actual billing calculations
  const localTotal = (shouldIncludePackage ? packagePrice : 0) + additionalTotal + productSalesTotal;

  // ✅ ACTUAL BILLING TOTAL: Use payment summary from backend (invoices ONLY)
  // Backend ensures: invoices are single source of truth, no double-counting
  const total = paymentSummary.totalAmount > 0 ? paymentSummary.totalAmount : localTotal;

  // Use payment summary for paid/remaining amounts
  const paid = paymentSummary.totalPaid;
  const remaining = paymentSummary.remainingAmount;

  const handleAddCharge = async () => {
    if (newCharge.name && newCharge.amount) {
      const charge = {
        name: newCharge.name,
        amount: parseFloat(newCharge.amount),
      };
      const updatedCharges = [...additionalCharges, charge];
      setAdditionalCharges(updatedCharges);
      setNewCharge({ name: "", amount: "" });

      try {
        // Use the new items-based API to add charges
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
          const error = await response.json();
          console.error('Failed to add charge:', error);
        } else {
          // Refresh client data
          const res = await fetch(`/api/clients/${id}`, {
            credentials: 'include',
            cache: 'no-store',
          });
          if (res.ok) {
            const data = await res.json();
            setClient(data);
          }
        }
      } catch (error) {
        console.error('Error saving additional charge:', error);
      }
    }
  };

  const handleRemoveCharge = (index: number) => {
    setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
  };

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
    const message = `
📄 *Package Invoice*
INV #${client.id.slice(0, 6).toUpperCase()}
Date: ${formatDate(new Date())}

👤 *Client Details*
Name: ${client.name}
Phone: ${client.phone}
Address: ${client.area?.name || client.areaName || 'N/A'}, ${client.city}

📦 *Package Detail*
Package: ${client.package?.name}
Duration: 1 Month

💰 *Payment Detail*
${shouldIncludePackage ? `Package Charges: ${formatPKR(packagePrice)}\n` : ''}One-Time Charges: ${formatPKR(additionalTotal)}
Subtotal: ${formatPKR(total)}
Discount: ${formatPKR(0)}
Grand Total: ${formatPKR(total)}

💳 *Payment Status*
Paid Amount: ${formatPKR(paid)}
Remaining Amount: ${formatPKR(remaining)}

Last Payment: ${client.latestPaymentDate ? formatDate(client.latestPaymentDate) : "N/A"}
Expiry Date: ${formatDate(client.expiryDate || new Date())}
Status: ${effectiveStatus === "PAID" ? "✅ PAID" : effectiveStatus === "PARTIAL" ? "⏳ PARTIAL" : "❌ UNPAID"}

Please clear your dues. Thank you!
`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-blue-50 flex flex-col items-center justify-center p-4 gap-3">
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
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-500/60 dark:border-violet-400/60 px-4 py-2 text-sm font-semibold text-white bg-violet-600 dark:bg-violet-500 transition-all duration-200 ease-out hover:border-violet-400/60 dark:hover:border-violet-300/60 hover:bg-violet-700 dark:hover:bg-violet-400 hover:shadow-lg hover:shadow-violet-500/20 dark:hover:shadow-violet-400/20 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Pay Now
          </button>
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
            INV #{client.id.slice(0, 6).toUpperCase()}
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
                  value={newCharge.amount}
                  onChange={(e) =>
                    setNewCharge({ ...newCharge, amount: e.target.value })
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
            <span className="text-sm font-semibold text-slate-700">
              Total Outstanding
            </span>
            <span className="text-2xl font-bold text-indigo-700">
              {formatPKR(total)}
            </span>
          </div>
          {paymentSummary.totalAmount > localTotal && (
            <p className="text-xs text-slate-500 mt-2">
              Includes {formatPKR(paymentSummary.totalAmount - localTotal)} from unpaid invoices + {formatPKR(localTotal)} from this page
            </p>
          )}
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
      {client && remaining > 0 && showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={remaining}
          title={`Invoice #${client.id.slice(0, 6).toUpperCase()}`}
          description={`Payment for ${client.name}`}
          metadata={{
            referenceType: "invoice",
            referenceId: client.id,
            clientId: client.id,
            invoiceId: client.id,
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

// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { Client, Package, ServiceProvider } from "@prisma/client";
// import Image from "next/image";
// import PaymentModal from "@/components/payments/PaymentModal";

// interface ClientWithPackage extends Client {
//   package: Package & { serviceProvider?: ServiceProvider | null };
// }

// interface ExtendedClient extends Omit<
//   ClientWithPackage,
//   "expiryDate" | "paymentStatus"
// > {
//   paymentStatus?: string;
//   expiryDate?: Date;
//   totalPaid?: number;
//   remainingAmount?: number;
//   totalAmount?: number;
//   effectivePaymentStatus?: "paid" | "partial" | "unpaid";
//   latestPaymentDate?: Date | null;
// }

// export default function ClientInvoicePage() {
//   const { id } = useParams();
//   const router = useRouter();

//   const [client, setClient] = useState<ExtendedClient | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [additionalCharges, setAdditionalCharges] = useState<
//     Array<{ name: string; amount: number }>
//   >([]);
//   const [showAddCharges, setShowAddCharges] = useState(false);
//   const [newCharge, setNewCharge] = useState({ name: "", amount: "" });

//   useEffect(() => {
//     const fetchClient = async () => {
//       try {
//         const res = await fetch(`/api/clients/${id}`, {
//           credentials: "include",
//           cache: "no-store",
//         });

//         if (res.ok) {
//           const data = await res.json();
//           setClient(data);

//           // Load existing additional charges from the first invoice if available
//           if (
//             data.invoices &&
//             data.invoices.length > 0 &&
//             data.invoices[0].additionalCharges
//           ) {
//             try {
//               const charges =
//                 typeof data.invoices[0].additionalCharges === "string"
//                   ? JSON.parse(data.invoices[0].additionalCharges)
//                   : data.invoices[0].additionalCharges;
//               if (Array.isArray(charges)) {
//                 setAdditionalCharges(charges);
//               }
//             } catch (error) {
//               console.error("Error loading additional charges:", error);
//             }
//           }
//         } else if (res.status === 401) {
//           router.push("/login");
//         } else {
//           router.push("/login"); // Redirect to login on any error
//         }
//       } catch (err) {
//         console.error(err);
//         router.push("/login"); // Redirect to login on error
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) fetchClient();
//   }, [id, router]);

//   const formatDate = (date: Date | string) =>
//     new Date(date).toLocaleDateString("en-PK");

//   const formatPKR = (amount: number) =>
//     new Intl.NumberFormat("en-PK", {
//       style: "currency",
//       currency: "PKR",
//       maximumFractionDigits: 0,
//     }).format(amount);

//   if (loading || !client) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         Loading...
//       </div>
//     );
//   }

//   // ✅ Correct calculation logic
//   const packagePrice = client.price || 0;
//   const additionalTotal = additionalCharges.reduce(
//     (sum, c) => sum + c.amount,
//     0,
//   );
//   const total = packagePrice + additionalTotal;
//   const paid = client.totalPaid ?? 0;
//   const remaining = total - paid;

//   // Add charge to list
//   const handleAddCharge = async () => {
//     if (newCharge.name && newCharge.amount) {
//       const charge = {
//         name: newCharge.name,
//         amount: parseFloat(newCharge.amount),
//       };
//       const updatedCharges = [...additionalCharges, charge];
//       setAdditionalCharges(updatedCharges);
//       setNewCharge({ name: "", amount: "" });

//       // Save additional charges to the first invoice for this client
//       try {
//         // Find or create an invoice for this client
//         const invoicesResponse = await fetch(
//           `/api/invoices?clientId=${client.id}`,
//           {
//             credentials: "include",
//           },
//         );

//         let invoiceId: string | null = null;

//         if (invoicesResponse.ok) {
//           const invoices = await invoicesResponse.json();
//           if (invoices.length > 0) {
//             // Use the first invoice
//             invoiceId = invoices[0].id;
//           }
//         }

//         if (!invoiceId) {
//           // Create a new invoice
//           const createResponse = await fetch("/api/invoices", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             credentials: "include",
//             body: JSON.stringify({
//               clientId: client.id,
//               amount: client.price,
//               dueDate: new Date().toISOString().split("T")[0],
//               description: `Invoice for ${client.name}`,
//               additionalCharges: updatedCharges,
//             }),
//           });

//           if (createResponse.ok) {
//             const newInvoice = await createResponse.json();
//             console.log("Created invoice with additional charges:", newInvoice);
//           }
//         } else {
//           // Update existing invoice with additional charges
//           const updateResponse = await fetch(
//             `/api/invoices/${invoiceId}/additional-charges`,
//             {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               credentials: "include",
//               body: JSON.stringify({
//                 invoiceId,
//                 additionalCharges: updatedCharges,
//               }),
//             },
//           );

//           if (!updateResponse.ok) {
//             console.error("Failed to update invoice with additional charges");
//           }
//         }
//       } catch (error) {
//         console.error("Error saving additional charges:", error);
//       }
//     }
//   };

//   // Remove charge from list
//   const handleRemoveCharge = (index: number) => {
//     setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
//   };

//   // ✅ Calculate status directly from amounts based on requested logic
//   let effectiveStatus: string;
//   let statusColor: string;

//   if (remaining < -0.01) {
//     effectiveStatus = "OVERPAID";
//     statusColor = "text-blue-600 bg-blue-100";
//   } else if (remaining <= 0.01) {
//     effectiveStatus = "PAID";
//     statusColor = "text-green-600 bg-green-100";
//   } else if (paid > 0) {
//     effectiveStatus = "PARTIAL";
//     statusColor = "text-yellow-600 bg-yellow-100";
//   } else {
//     effectiveStatus = "UNPAID";
//     statusColor = "text-red-600 bg-red-100";
//   }

//   // ✅ WhatsApp Message
//   const sendWhatsApp = () => {
//     const phone = client.phone.replace(/\D/g, "");

//     const message = `
// 📄 *Package Invoice*
// INV #${client.id.slice(0, 6).toUpperCase()}
// Date: ${formatDate(new Date())}

// 👤 *Client Details*
// Name: ${client.name}
// Phone: ${client.phone}
// Address: ${client.area}, ${client.city}

// 📦 *Package Detail*
// Package: ${client.package?.name}
// Duration: 1 Month

// 💰 *Payment Detail*
// Package Charges: ${formatPKR(packagePrice)}
// One-Time Charges: ${formatPKR(additionalTotal)}
// Subtotal: ${formatPKR(total)}
// Discount: ${formatPKR(0)}
// Grand Total: ${formatPKR(total)}

// 💳 *Payment Status*
// Paid Amount: ${formatPKR(paid)}
// Remaining Amount: ${formatPKR(remaining)}

// Last Payment: ${client.latestPaymentDate ? formatDate(client.latestPaymentDate) : "N/A"}
// Expiry Date: ${formatDate(client.expiryDate || new Date())}
// Status: ${effectiveStatus === "PAID" ? "✅ PAID" : effectiveStatus === "PARTIAL" ? "⏳ PARTIAL" : "❌ UNPAID"}

// Please clear your dues. Thank you!
// `;

//     window.open(
//       `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
//       "_blank",
//     );
//   };

//   return (
//     <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 gap-3">
//       {/* Action Buttons */}
//       <div className="flex gap-2">
//         <button
//           onClick={sendWhatsApp}
//           className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm shadow"
//         >
//           📲 Send via WhatsApp
//         </button>
//         {additionalCharges.length > 0 && (
//           <button
//             onClick={() =>
//               alert("One-time charges will be saved when you make a payment")
//             }
//             className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm shadow"
//           >
//             💾 Save One-Time Charges
//           </button>
//         )}
//         {remaining > 0.01 && (
//           <button
//             onClick={() => setShowPaymentModal(true)}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm shadow flex items-center gap-2"
//           >
//             💳 Pay Now
//           </button>
//         )}
//       </div>

//       {/* Ticket UI */}
//       <div className="w-full max-w-sm bg-white rounded-[30px] shadow-lg border relative overflow-hidden">
//         {/* Top Cut */}
//         <div className="absolute top-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />

//         {/* Header */}
//         <div className="text-center pt-8 pb-3 px-5">
//           <h1 className="text-lg font-semibold text-indigo-600">
//             Package Invoice
//           </h1>
//           <p className="text-xs text-slate-600 mt-1">
//             INV #{client.id.slice(0, 6).toUpperCase()}
//           </p>

//           <div className="mt-2 inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-md border border-green-300">
//             {formatDate(new Date())}
//           </div>
//         </div>

//         {/* User + Logo */}
//         <div className="flex justify-between items-center px-5 mt-3">
//           <div>
//             <h2 className="text-base font-semibold">{client.name}</h2>
//             <p className="text-xs text-indigo-500">{client.phone}</p>
//             <p className="text-[11px] text-slate-500">
//               {client.area}, {client.city}
//             </p>
//           </div>

//           <Image src="/logo.png" alt="Logo" width={50} height={50} />
//         </div>

//         {/* One-Time Charges Section */}
//         <div className="px-2 mt-1">
//           <div className="flex justify-between items-center mb-1">
//             <p className="bg-orange-100 text-orange-700 font-semibold text-xs px-1.5 py-0.5 rounded-md">
//               🔧 One-Time Charges
//             </p>
//             <button
//               onClick={() => setShowAddCharges(!showAddCharges)}
//               className="text-xs text-blue-600 hover:text-blue-700 font-medium"
//             >
//               {showAddCharges ? "Cancel" : "+ Add Charge"}
//             </button>
//           </div>

//           {showAddCharges && (
//             <div className="bg-slate-50 rounded-lg p-1.5 mb-1 space-y-1">
//               <div className="flex gap-1">
//                 <input
//                   type="text"
//                   placeholder="Item (e.g., Router)"
//                   value={newCharge.name}
//                   onChange={(e) =>
//                     setNewCharge({ ...newCharge, name: e.target.value })
//                   }
//                   className="flex-1 px-2 py-0.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//                 <input
//                   type="number"
//                   placeholder="Amount"
//                   value={newCharge.amount}
//                   onChange={(e) =>
//                     setNewCharge({ ...newCharge, amount: e.target.value })
//                   }
//                   className="w-20 px-2 py-0.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//                 <button
//                   onClick={handleAddCharge}
//                   className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
//                 >
//                   Add
//                 </button>
//               </div>
//             </div>
//           )}

//           {additionalCharges.length > 0 && (
//             <div className="space-y-1.5">
//               {additionalCharges.map((charge, index) => (
//                 <div
//                   key={index}
//                   className="flex justify-between text-xs items-center bg-slate-50 px-2 py-1.5 rounded"
//                 >
//                   <span className="text-slate-700">{charge.name}</span>
//                   <div className="flex items-center gap-1.5">
//                     <span className="text-slate-800 font-medium">
//                       {formatPKR(charge.amount)}
//                     </span>
//                     <button
//                       onClick={() => handleRemoveCharge(index)}
//                       className="text-red-500 hover:text-red-700 text-base font-bold"
//                     >
//                       ×
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Divider */}
//         <div className="px-5 mt-3">
//           <div className="h-px bg-slate-200" />
//         </div>

//         {/* Package Detail Section */}
//         <div className="px-5 mt-3">
//           <p className="bg-indigo-100 text-indigo-700 font-semibold text-xs px-2 py-1 rounded-md inline-block mb-1.5">
//             📦 Package Detail
//           </p>

//           <div className="space-y-0.5">
//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Package</span>
//               <span className="text-slate-800 font-medium">
//                 {client.package?.name}
//               </span>
//             </div>
//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Duration</span>
//               <span className="text-slate-800 font-medium">1 Month</span>
//             </div>
//           </div>
//         </div>

//         {/* Divider */}
//         <div className="px-5 mt-3">
//           <div className="h-px bg-slate-200" />
//         </div>

//         {/* 💰 Payment Detail Section */}
//         <div className="px-5 mt-3 space-y-0.5">
//           <p className="bg-indigo-100 text-indigo-700 font-semibold text-xs px-2 py-1 rounded-md inline-block mb-1.5">
//             💰 Payment Detail
//           </p>

//           <div className="space-y-0.5">
//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Package Charges</span>
//               <span className="text-slate-800 font-medium">
//                 {formatPKR(packagePrice)}
//               </span>
//             </div>

//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">One-Time Charges</span>
//               <span className="text-slate-800 font-medium">
//                 {formatPKR(additionalTotal)}
//               </span>
//             </div>

//             <div className="h-px bg-slate-300 my-1.5" />

//             <div className="flex justify-between text-xs font-semibold">
//               <span className="text-slate-700">Subtotal</span>
//               <span className="text-slate-800">{formatPKR(total)}</span>
//             </div>

//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Discount</span>
//               <span className="text-slate-800 font-medium">{formatPKR(0)}</span>
//             </div>

//             <div className="h-px bg-slate-300 my-1.5" />

//             <div className="flex justify-between text-sm font-bold bg-indigo-50 px-2 py-1.5 rounded mt-1.5">
//               <span className="text-indigo-700">Grand Total</span>
//               <span className="text-indigo-700">{formatPKR(total)}</span>
//             </div>
//           </div>
//         </div>

//         {/* Divider */}
//         <div className="px-5 mt-3">
//           <div className="h-px bg-slate-200" />
//         </div>

//         {/* 💳 Payment Status Section */}
//         <div className="px-5 mt-3 space-y-0.5">
//           <p className="bg-indigo-100 text-indigo-700 font-semibold text-xs px-2 py-1 rounded-md inline-block mb-1.5">
//             💳 Payment Status
//           </p>

//           <div className="space-y-0.5">
//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Paid Amount</span>
//               <span className="text-green-600 font-semibold">
//                 {formatPKR(paid)}
//               </span>
//             </div>

//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Remaining Amount</span>
//               <span
//                 className={`font-semibold ${remaining > 0.01 ? "text-red-600" : remaining < -0.01 ? "text-blue-600" : "text-green-600"}`}
//               >
//                 {formatPKR(remaining)}
//               </span>
//             </div>

//             {client.latestPaymentDate && (
//               <div className="flex justify-between text-xs">
//                 <span className="text-slate-600">Last Payment</span>
//                 <span className="text-slate-800 font-medium">
//                   {formatDate(client.latestPaymentDate)}
//                 </span>
//               </div>
//             )}

//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Expiry Date</span>
//               <span className="text-slate-800 font-medium">
//                 {formatDate(client.expiryDate || new Date())}
//               </span>
//             </div>

//             <div className="h-px bg-slate-300 my-1.5" />

//             <div className="flex justify-between items-center pt-0.5">
//               <span className="text-slate-600 text-xs">Status</span>
//               <span
//                 className={`px-2 py-1 rounded-md text-xs font-bold ${statusColor}`}
//               >
//                 {effectiveStatus === "PAID"
//                   ? "✅ "
//                   : effectiveStatus === "PARTIAL"
//                     ? "⏳ "
//                     : "❌ "}
//                 {effectiveStatus}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* TOTAL PAID BOX - Summary */}
//         <div className="px-5 mt-4 mb-6">
//           <div className="bg-linear-to-r from-indigo-500 to-blue-600 rounded-lg px-3 py-2 flex justify-between items-center shadow-md">
//             <span className="text-white text-xs font-semibold">Total Paid</span>
//             <span className="text-xl font-bold text-white">
//               {formatPKR(paid)}
//             </span>
//           </div>
//         </div>

//         {/* Bottom Cut */}
//         <div className="absolute bottom-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />
//       </div>

//       {/* Payment Modal */}
//       {client && remaining > 0 && showPaymentModal && (
//         <PaymentModal
//           isOpen={showPaymentModal}
//           onClose={() => setShowPaymentModal(false)}
//           amount={remaining}
//           title={`Invoice #${client.id.slice(0, 6).toUpperCase()}`}
//           description={`Payment for ${client.name}`}
//           metadata={{
//             referenceType: "invoice",
//             referenceId: client.id,
//             clientId: client.id,
//             invoiceId: client.id,
//           }}
//           additionalCharges={
//             additionalCharges.length > 0 ? additionalCharges : undefined
//           }
//         />
//       )}

//       {/* Print */}
//       <style jsx global>{`
//         @media print {
//           button {
//             display: none;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }
