'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  Plus,
  Trash2,
  Package,
  ShoppingBag,
  Edit3,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Receipt,
  Calendar,
  FileText,
} from 'lucide-react';
import type { ProductSaleResult } from '@/modules/product-sales/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceItem {
  id: string;  // Stable unique ID for each item
  name: string;
  description: string;
  amount: string;
  quantity: number;
}

interface ExistingInvoice {
  id: string;
  amount: number;
  totalAmount: number;
  issuedDate: Date;
  status: string;
}

interface InvoiceCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  packageName?: string;
  packagePrice?: number;
  outstandingAmount?: number;
  onSuccess: () => void;
}

type InvoiceMode = 'custom' | 'package' | 'product';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPKR = (value: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoiceCreationDialog({
  isOpen,
  onClose,
  clientId,
  clientName,
  packageName = 'N/A',
  packagePrice = 0,
  outstandingAmount = 0,
  onSuccess,
}: InvoiceCreationDialogProps) {
  // State
  const [mode, setMode] = useState<InvoiceMode>('custom');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), name: '', description: '', amount: '', quantity: 1 },
  ]);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getDefaultDueDate);

  // Confirmation dialog state
  const [existingInvoice, setExistingInvoice] = useState<ExistingInvoice | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [successMessage, setSuccessMessage] = useState<string | null>(null);

   // Product sales fetching state
   const [productSales, setProductSales] = useState<ProductSaleResult[]>([]);
   const [loadingProductSales, setLoadingProductSales] = useState(false);

   // Reset form on open
   useEffect(() => {
     if (isOpen) {
       resetForm();
     }
   }, [isOpen]);

   // Fetch product sales when dialog opens and clientId is available
   useEffect(() => {
     if (!isOpen || !clientId) return;

     const fetchProductSales = async () => {
       setLoadingProductSales(true);
       try {
         const res = await fetch(`/api/product-sales?clientId=${clientId}`, {
           credentials: 'include',
         });
         if (res.ok) {
           const data = await res.json();
           setProductSales(data.data || []);
         } else {
           setProductSales([]);
         }
       } catch (err) {
         console.error('Failed to fetch product sales:', err);
         setProductSales([]);
       } finally {
         setLoadingProductSales(false);
       }
     };

     fetchProductSales();
   }, [isOpen, clientId]);

  // ─── Item Management ────────────────────────────────────────────────────

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', description: '', amount: '', quantity: 1 },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }, []);

  const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  // Add product sale as a new line item
  const addProductSaleItem = useCallback((sale: ProductSaleResult) => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      name: sale.productName,
      description: sale.notes || '',
      amount: sale.sellingPrice.toString(),
      quantity: sale.quantity,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  // ─── Calculations ───────────────────────────────────────────────────────

  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0) * item.quantity,
    0
  );

  // ─── Mode Selection Handlers ────────────────────────────────────────────

  const handlePackageSelected = useCallback(() => {
    setMode('package');
    setItems([
      {
        id: crypto.randomUUID(),
        name: 'Internet Package',
        description: `Monthly subscription - ${packageName}`,
        amount: packagePrice.toString(),
        quantity: 1,
      },
    ]);
  }, [packageName, packagePrice]);

  const handleProductSaleSelected = useCallback(() => {
    setMode('product');
    setItems([{ id: crypto.randomUUID(), name: '', description: '', amount: '', quantity: 1 }]);
  }, []);

  const handleCustomSelected = useCallback(() => {
    setMode('custom');
    setItems([{ id: crypto.randomUUID(), name: '', description: '', amount: '', quantity: 1 }]);
  }, []);

  // ─── Invoice Creation ───────────────────────────────────────────────────

  const createInvoice = async (appendToExisting?: boolean) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const validItems = items
        .filter((item) => item.name && item.amount)
        .map((item) => ({
          name: item.name,
          description: item.description || undefined,
          amount: parseFloat(item.amount),
          quantity: item.quantity || 1,
        }));

      if (validItems.length === 0) {
        setError('Please add at least one valid item with name and amount');
        return;
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId,
          items: validItems,
          description: description || undefined,
          dueDate,
          appendToExisting,
        }),
      });

      if (response.status === 409) {
        const data = await response.json();
        if (data.existingInvoice && data.action === 'ask_user') {
          setExistingInvoice(data.existingInvoice);
          setShowConfirmation(true);
          return;
        }
        setError(data.error || 'Client already has an unpaid invoice');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create invoice');
        return;
      }

      const result = await response.json();
      setSuccessMessage(`Invoice created successfully — ${formatPKR(subtotal)}`);

      // Delay close so user sees success message
      setTimeout(() => {
        onSuccess();
        resetForm();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvoice();
  };

  const handleAppendToExisting = () => {
    setShowConfirmation(false);
    createInvoice(true);
  };

  const handleCreateNewInvoice = () => {
    setShowConfirmation(false);
    createInvoice(false);
  };

  const resetForm = useCallback(() => {
    setMode('custom');
    setItems([{ id: crypto.randomUUID(), name: '', description: '', amount: '', quantity: 1 }]);
    setDescription('');
    setDueDate(getDefaultDueDate);
    setError(null);
    setSuccessMessage(null);
    setExistingInvoice(null);
    setShowConfirmation(false);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetForm, onClose]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Invoice" size="2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Client Info Bar ──────────────────────────────────────────── */}
        <div
          className="rounded-xl border border-gray-200/60 dark:border-gray-700/60
                     bg-linear-to-r from-blue-50/60 via-indigo-50/40 to-blue-50/60
                     dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-blue-900/20
                     p-4 transition-all duration-300 ease-out"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full
                           bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20"
              >
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {clientName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {packageName}
                </p>
              </div>
            </div>
            {outstandingAmount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">
                  Outstanding: {formatPKR(outstandingAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Invoice Type Selector ────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Invoice Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Package */}
            <button
              type="button"
              onClick={handlePackageSelected}
              className={`
                group relative flex flex-col items-center gap-2 rounded-xl border p-4
                transition-all duration-300 ease-out hover:-translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                ${
                  mode === 'package'
                    ? 'border-blue-500/60 dark:border-blue-400/60 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10 dark:shadow-blue-400/10'
                    : 'border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800 hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10'
                }
              `}
            >
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200
                  ${
                    mode === 'package'
                      ? 'bg-blue-500/20 dark:bg-blue-400/20 border-blue-500/40 dark:border-blue-400/40'
                      : 'bg-gray-100/50 dark:bg-gray-700/50 border-gray-200/60 dark:border-gray-600/60 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-400/10 group-hover:border-blue-500/40 dark:group-hover:border-blue-400/40'
                  }
                `}
              >
                <Package
                  className={`h-5 w-5 transition-colors duration-200 ${
                    mode === 'package'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`}
                />
              </div>
              <span
                className={`text-xs font-semibold transition-colors duration-200 ${
                  mode === 'package'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-700 dark:group-hover:text-blue-300'
                }`}
              >
                Package
              </span>
              {mode === 'package' && (
                <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>

            {/* Product */}
            <button
              type="button"
              onClick={handleProductSaleSelected}
              className={`
                group relative flex flex-col items-center gap-2 rounded-xl border p-4
                transition-all duration-300 ease-out hover:-translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                ${
                  mode === 'product'
                    ? 'border-violet-500/60 dark:border-violet-400/60 bg-violet-50/50 dark:bg-violet-900/20 shadow-lg shadow-violet-500/10 dark:shadow-violet-400/10'
                    : 'border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800 hover:border-violet-500/60 dark:hover:border-violet-400/60 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-400/10'
                }
              `}
            >
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200
                  ${
                    mode === 'product'
                      ? 'bg-violet-500/20 dark:bg-violet-400/20 border-violet-500/40 dark:border-violet-400/40'
                      : 'bg-gray-100/50 dark:bg-gray-700/50 border-gray-200/60 dark:border-gray-600/60 group-hover:bg-violet-500/10 dark:group-hover:bg-violet-400/10 group-hover:border-violet-500/40 dark:group-hover:border-violet-400/40'
                  }
                `}
              >
                <ShoppingBag
                  className={`h-5 w-5 transition-colors duration-200 ${
                    mode === 'product'
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400'
                  }`}
                />
              </div>
              <span
                className={`text-xs font-semibold transition-colors duration-200 ${
                  mode === 'product'
                    ? 'text-violet-700 dark:text-violet-300'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-violet-700 dark:group-hover:text-violet-300'
                }`}
              >
                Product
              </span>
              {mode === 'product' && (
                <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-violet-600 dark:text-violet-400" />
              )}
            </button>

            {/* Custom */}
            <button
              type="button"
              onClick={handleCustomSelected}
              className={`
                group relative flex flex-col items-center gap-2 rounded-xl border p-4
                transition-all duration-300 ease-out hover:-translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                ${
                  mode === 'custom'
                    ? 'border-emerald-500/60 dark:border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-400/10'
                    : 'border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10'
                }
              `}
            >
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200
                  ${
                    mode === 'custom'
                      ? 'bg-emerald-500/20 dark:bg-emerald-400/20 border-emerald-500/40 dark:border-emerald-400/40'
                      : 'bg-gray-100/50 dark:bg-gray-700/50 border-gray-200/60 dark:border-gray-600/60 group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-400/10 group-hover:border-emerald-500/40 dark:group-hover:border-emerald-400/40'
                  }
                `}
              >
                <Edit3
                  className={`h-5 w-5 transition-colors duration-200 ${
                    mode === 'custom'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                  }`}
                />
              </div>
              <span
                className={`text-xs font-semibold transition-colors duration-200 ${
                  mode === 'custom'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300'
                }`}
              >
                Custom
              </span>
              {mode === 'custom' && (
                <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* ── Product Sales Selection (when in Product mode) ───────────────── */}
        {mode === 'product' && (
          <div className="mb-6 rounded-xl border border-violet-200/60 dark:border-violet-700/60 bg-violet-50/30 dark:bg-violet-900/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Product Sales for {clientName}
              </h3>
              {productSales.length > 0 && (
                <span className="text-xs text-violet-600 dark:text-violet-400">
                  {productSales.length} record{productSales.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {loadingProductSales ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600 dark:text-violet-400" />
                <span className="ml-2 text-sm text-violet-600 dark:text-violet-400">Loading product sales...</span>
              </div>
            ) : productSales.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No product sales recorded for this client yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-violet-300 dark:scrollbar-thumb-violet-700 scrollbar-track-transparent">
                {productSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-violet-200/60 dark:border-violet-700/60 hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                        {sale.productName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPKR(sale.sellingPrice)} × {sale.quantity} = {formatPKR(sale.sellingPrice * sale.quantity)}
                        {sale.notes && (
                          <span className="block italic truncate">"{sale.notes}"</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addProductSaleItem(sale)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors shrink-0"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-violet-600/80 dark:text-violet-400/80">
              Click &quot;Add&quot; to include this product in the invoice items below.
            </p>
          </div>
        )}

        {/* ── Line Items ───────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              Line Items
            </label>
            <button
              type="button"
              onClick={addItem}
              className="
                inline-flex items-center gap-1.5 rounded-lg border border-blue-500/60 dark:border-blue-400/60
                px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400
                bg-blue-50/50 dark:bg-blue-900/20
                transition-all duration-200 ease-out
                hover:border-blue-600/60 dark:hover:border-blue-300/60
                hover:bg-blue-100/50 dark:hover:bg-blue-800/30
                hover:shadow-md hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10
                hover:-translate-y-0.5
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
              "
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {items.map((item) => {
              const lineTotal = (parseFloat(item.amount) || 0) * item.quantity;
              const itemIndex = items.indexOf(item);
              return (
                <div
                  key={item.id}
                  className="
                    group relative rounded-xl border border-gray-200/60 dark:border-gray-700/60
                    bg-gray-50/50 dark:bg-gray-800/50
                    p-3
                    transition-all duration-300 ease-out
                    hover:border-gray-300/60 dark:hover:border-gray-600/60
                    hover:bg-white dark:hover:bg-gray-800
                    hover:shadow-md hover:shadow-gray-500/5 dark:hover:shadow-gray-400/5
                  "
                >
                  <div className="flex items-start gap-2">
                    {/* Item Number Badge */}
                    <div
                      className="
                        mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                        bg-gray-200/60 dark:bg-gray-700/60
                        text-[10px] font-bold text-gray-500 dark:text-gray-400
                      "
                    >
                      {itemIndex + 1}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      {/* Name + Amount Row */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateItem(itemIndex, 'name', e.target.value)}
                          className="
                            flex-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60
                            bg-white dark:bg-gray-900/50
                            px-3 py-2 text-sm text-gray-900 dark:text-gray-50
                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                            transition-all duration-200 ease-out
                            focus:border-blue-500/60 dark:focus:border-blue-400/60
                            focus:bg-white dark:focus:bg-gray-900
                            focus:outline-none focus:ring-2 focus:ring-blue-500/50
                          "
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Amt"
                            value={item.amount}
                            onChange={(e) => updateItem(itemIndex, 'amount', e.target.value)}
                            className="
                              w-24 rounded-lg border border-gray-200/60 dark:border-gray-700/60
                              bg-white dark:bg-gray-900/50
                              px-3 py-2 text-sm text-gray-900 dark:text-gray-50
                              placeholder:text-gray-400 dark:placeholder:text-gray-500
                              transition-all duration-200 ease-out
                              focus:border-blue-500/60 dark:focus:border-blue-400/60
                              focus:bg-white dark:focus:bg-gray-900
                              focus:outline-none focus:ring-2 focus:ring-blue-500/50
                            "
                            min="0"
                            step="0.01"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(itemIndex, 'quantity', parseInt(e.target.value) || 1)
                            }
                            className="
                              w-16 rounded-lg border border-gray-200/60 dark:border-gray-700/60
                              bg-white dark:bg-gray-900/50
                              px-2 py-2 text-sm text-gray-900 dark:text-gray-50
                              placeholder:text-gray-400 dark:placeholder:text-gray-500
                              transition-all duration-200 ease-out
                              focus:border-blue-500/60 dark:focus:border-blue-400/60
                              focus:bg-white dark:focus:bg-gray-900
                              focus:outline-none focus:ring-2 focus:ring-blue-500/50
                            "
                            min="1"
                          />
                        </div>
                      </div>

                      {/* Description + Line Total Row */}
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={item.description}
                          onChange={(e) => updateItem(itemIndex, 'description', e.target.value)}
                          className="
                            flex-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60
                            bg-white dark:bg-gray-900/50
                            px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400
                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                            transition-all duration-200 ease-out
                            focus:border-blue-500/60 dark:focus:border-blue-400/60
                            focus:bg-white dark:focus:bg-gray-900
                            focus:outline-none focus:ring-2 focus:ring-blue-500/50
                          "
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {formatPKR(lineTotal)}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(itemIndex)}
                              className="
                                inline-flex h-7 w-7 items-center justify-center rounded-lg
                                border border-transparent
                                text-gray-400 dark:text-gray-500
                                transition-all duration-200 ease-out
                                hover:border-red-500/60 dark:hover:border-red-400/60
                                hover:bg-red-50/50 dark:hover:bg-red-900/20
                                hover:text-red-600 dark:hover:text-red-400
                                hover:shadow-sm hover:shadow-red-500/10 dark:hover:shadow-red-400/10
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50
                              "
                              aria-label={`Remove item ${itemIndex + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Summary Card ─────────────────────────────────────────────── */}
        <div
          className="
            sticky bottom-0 z-10 rounded-xl border border-gray-200/60 dark:border-gray-700/60
            bg-white/80 dark:bg-gray-800/80 backdrop-blur-md
            p-4
            transition-all duration-300 ease-out
          "
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="font-medium text-gray-900 dark:text-gray-50">
                {formatPKR(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Items</span>
              <span className="font-medium text-gray-900 dark:text-gray-50">
                {items.filter((i) => i.name && i.amount).length}
              </span>
            </div>
            <div className="border-t border-gray-200/60 dark:border-gray-700/60 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
                Total Amount
              </span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatPKR(subtotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Description ──────────────────────────────────────────────── */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            Description
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
              (optional)
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Invoice description..."
            rows={2}
            className="
              w-full rounded-lg border border-gray-200/60 dark:border-gray-700/60
              bg-white dark:bg-gray-900/50
              px-3 py-2 text-sm text-gray-900 dark:text-gray-50
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              transition-all duration-200 ease-out
              focus:border-blue-500/60 dark:focus:border-blue-400/60
              focus:bg-white dark:focus:bg-gray-900
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              resize-none
            "
          />
        </div>

        {/* ── Due Date ─────────────────────────────────────────────────── */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="
              w-full rounded-lg border border-gray-200/60 dark:border-gray-700/60
              bg-white dark:bg-gray-900/50
              px-3 py-2 text-sm text-gray-900 dark:text-gray-50
              transition-all duration-200 ease-out
              focus:border-blue-500/60 dark:focus:border-blue-400/60
              focus:bg-white dark:focus:bg-gray-900
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            "
          />
        </div>

        {/* ── Error Message ────────────────────────────────────────────── */}
        {error && (
          <div
            className="
              flex items-start gap-3 rounded-xl border border-red-500/60 dark:border-red-400/60
              bg-red-50/50 dark:bg-red-900/20
              p-3
              transition-all duration-300 ease-out
            "
            role="alert"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* ── Success Message ──────────────────────────────────────────── */}
        {successMessage && (
          <div
            className="
              flex items-start gap-3 rounded-xl border border-emerald-500/60 dark:border-emerald-400/60
              bg-emerald-50/50 dark:bg-emerald-900/20
              p-3
              transition-all duration-300 ease-out
            "
            role="status"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
          </div>
        )}

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        <div className="flex gap-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="
              flex-1 inline-flex items-center justify-center gap-2
              rounded-lg border border-gray-200/60 dark:border-gray-700/60
              px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300
              bg-white dark:bg-gray-800
              transition-all duration-200 ease-out
              hover:border-gray-300/60 dark:hover:border-gray-600/60
              hover:bg-gray-50/50 dark:hover:bg-gray-700/50
              hover:shadow-md hover:shadow-gray-500/5 dark:hover:shadow-gray-400/5
              hover:-translate-y-0.5
              disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50
            "
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="
              flex-1 inline-flex items-center justify-center gap-2
              rounded-lg border border-transparent
              px-4 py-2.5 text-sm font-semibold text-white
              bg-blue-600 dark:bg-blue-500
              transition-all duration-200 ease-out
              hover:border-blue-400/60 dark:hover:border-blue-300/60
              hover:bg-blue-700 dark:hover:bg-blue-400
              hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20
              hover:-translate-y-0.5
              disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
            "
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Create Invoice
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Duplicate Invoice Confirmation Overlay ─────────────────────── */}
      {showConfirmation && existingInvoice && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-title"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className="
              relative w-full max-w-md
              rounded-2xl border border-amber-500/60 dark:border-amber-400/60
              bg-white dark:bg-gray-800
              shadow-2xl shadow-amber-500/10 dark:shadow-amber-400/10
              p-6
              animate-in fade-in zoom-in-95 duration-300 ease-out
            "
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div
                className="
                  flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                  bg-amber-500/20 dark:bg-amber-400/20 border border-amber-500/40 dark:border-amber-400/40
                "
              >
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 id="confirmation-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Outstanding Invoice Detected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  This client has an unpaid invoice of{' '}
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {formatPKR(existingInvoice.totalAmount || existingInvoice.amount)}
                  </span>{' '}
                  dated {new Date(existingInvoice.issuedDate).toLocaleDateString()}.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              What would you like to do?
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleAppendToExisting}
                disabled={loading}
                className="
                  w-full rounded-xl border border-blue-500/60 dark:border-blue-400/60
                  bg-blue-50/50 dark:bg-blue-900/20
                  px-4 py-3 text-left
                  transition-all duration-200 ease-out
                  hover:border-blue-600/60 dark:hover:border-blue-300/60
                  hover:bg-blue-100/50 dark:hover:bg-blue-800/30
                  hover:shadow-md hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10
                  hover:-translate-y-0.5
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                "
              >
                <span className="block text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Append to Existing Invoice
                </span>
                <span className="block text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                  Add items to invoice #{existingInvoice.id.slice(0, 8).toUpperCase()}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCreateNewInvoice}
                disabled={loading}
                className="
                  w-full rounded-xl border border-gray-200/60 dark:border-gray-700/60
                  bg-white dark:bg-gray-800
                  px-4 py-3 text-left
                  transition-all duration-200 ease-out
                  hover:border-gray-300/60 dark:hover:border-gray-600/60
                  hover:bg-gray-50/50 dark:hover:bg-gray-700/50
                  hover:shadow-md hover:shadow-gray-500/5 dark:hover:shadow-gray-400/5
                  hover:-translate-y-0.5
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50
                "
              >
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Create New Invoice
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Create a separate invoice for this client
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="
                  w-full px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400
                  transition-all duration-200 ease-out
                  hover:text-gray-700 dark:hover:text-gray-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50
                "
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
