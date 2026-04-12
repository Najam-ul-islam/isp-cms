'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, Plus, Search, Calendar, Trash2, ChevronLeft, ChevronRight,
  IndianRupee, TrendingUp, TrendingDown, FileText, X, AlertCircle,
  CheckCircle, RefreshCw, User, ShoppingCart
} from 'lucide-react';

interface ProductSale {
  id: string;
  clientId: string | null;
  productName: string;
  actualPrice: number;
  sellingPrice: number;
  quantity: number;
  unitProfit: number;
  totalOtherIncome: number;
  notes: string | null;
  saleDate: string;
  client?: {
    id: string;
    name: string;
  } | null;
}

interface OtherIncomeSummary {
  totalOtherIncome: number;
  count: number;
}

interface SaleFormData {
  clientId: string;
  productName: string;
  actualPrice: string;
  sellingPrice: string;
  quantity: string;
  notes: string;
  saleDate: string;
}

const ITEMS_PER_PAGE = 15;

export default function ProductSalesPage() {
  const router = useRouter();

  // Sales list state
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Summary state
  const [summary, setSummary] = useState<OtherIncomeSummary>({ totalOtherIncome: 0, count: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [todaySales, setTodaySales] = useState<number>(0);

  // Clients dropdown
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<SaleFormData>({
    clientId: '',
    productName: '',
    actualPrice: '',
    sellingPrice: '',
    quantity: '1',
    notes: '',
    saleDate: new Date().toISOString().split('T')[0],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [stockAlert, setStockAlert] = useState<{ type: 'warning' | 'error' | 'success'; message: string } | null>(null);

  // Refs to prevent duplicate fetches
  const isMounted = useRef(false);
  const hasFetched = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Fetch inventory items
  const fetchInventory = useCallback(async (signal: AbortSignal) => {
    try {
      setInventoryLoading(true);
      const res = await fetch('/api/inventory', {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || 'piece',
          unitPrice: item.unitPrice,
        })));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching inventory:', err);
      }
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  // Check product availability in inventory
  const checkProductAvailability = useCallback((productName: string, requestedQuantity: number): { available: boolean; currentStock: number } => {
    const normalizedProductName = productName.toLowerCase().trim();
    
    const matchingItem = inventoryItems.find(item => 
      item.name.toLowerCase().trim() === normalizedProductName
    );

    if (!matchingItem) {
      // Product not in inventory - allow sale (might be a service)
      return { available: true, currentStock: -1 };
    }

    if (matchingItem.quantity >= requestedQuantity) {
      return { available: true, currentStock: matchingItem.quantity };
    }

    return { available: false, currentStock: matchingItem.quantity };
  }, [inventoryItems]);

  // Deduct from inventory
  const deductFromInventory = useCallback(async (productName: string, quantity: number) => {
    const normalizedProductName = productName.toLowerCase().trim();
    const matchingItem = inventoryItems.find(item => 
      item.name.toLowerCase().trim() === normalizedProductName
    );

    if (!matchingItem) return;

    try {
      // Create inventory transaction (OUT type)
      await fetch('/api/inventory/transactions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: matchingItem.id,
          type: 'OUT',
          quantity: quantity,
          note: `Product sale: ${productName} x ${quantity}`,
        }),
      });

      // Update local state
      setInventoryItems(prev => 
        prev.map(item => 
          item.id === matchingItem.id 
            ? { ...item, quantity: item.quantity - quantity }
            : item
        )
      );
    } catch (error) {
      console.error('Error deducting from inventory:', error);
    }
  }, [inventoryItems]);

  // Fetch clients for dropdown
  const fetchClients = useCallback(async (signal: AbortSignal) => {
    try {
      setClientsLoading(true);
      const res = await fetch('/api/clients', {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        setClients(data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching clients:', err);
      }
    } finally {
      setClientsLoading(false);
    }
  }, []);

  // Fetch summary (other income)
  const fetchSummary = useCallback(async (signal: AbortSignal) => {
    try {
      setSummaryLoading(true);
      const params = new URLSearchParams();
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);

      const res = await fetch(`/api/dashboard/other-income?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching summary:', err);
      }
    } finally {
      setSummaryLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  // Fetch today's sales
  const fetchTodaySales = useCallback(async (signal: AbortSignal) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/dashboard/other-income?startDate=${today}&endDate=${today}`, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        setTodaySales(data.count || 0);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching today sales:', err);
      }
    }
  }, []);

  // Fetch sales list
  const fetchSales = useCallback(async (signal: AbortSignal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '1000');
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);
      if (clientFilter !== 'all') params.set('clientId', clientFilter);

      const res = await fetch(`/api/product-sales?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        setSales(data.data || []);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching sales:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end, clientFilter, router]);

  // Initial data fetch
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    isMounted.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const checkAuthAndFetch = async () => {
      try {
        const authRes = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        });

        if (authRes.status === 401) {
          if (isMounted.current) {
            router.push('/login');
          }
          return;
        }

        await Promise.all([
          fetchClients(controller.signal),
          fetchInventory(controller.signal),
          fetchSummary(controller.signal),
          fetchTodaySales(controller.signal),
          fetchSales(controller.signal),
        ]);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Auth check failed:', err);
          if (isMounted.current) {
            router.push('/login');
          }
        }
      }
    };

    checkAuthAndFetch();

    return () => {
      isMounted.current = false;
      hasFetched.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [router, fetchClients, fetchSummary, fetchTodaySales, fetchSales]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, clientFilter, dateRange]);

  // Computed values
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  const pageTotalOtherIncome = paginatedSales.reduce((sum, sale) => sum + sale.totalOtherIncome, 0);

  // Live preview calculations
  const unitProfit = formData.sellingPrice && formData.actualPrice
    ? Number(formData.sellingPrice) - Number(formData.actualPrice)
    : 0;
  const totalOtherIncome = unitProfit * (Number(formData.quantity) || 0);

  // Handlers
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.productName.trim()) {
      setFormError('Product name is required');
      return;
    }

    if (!formData.sellingPrice || Number(formData.sellingPrice) < 0) {
      setFormError('Selling price must be 0 or greater');
      return;
    }

    if (!formData.actualPrice || Number(formData.actualPrice) < 0) {
      setFormError('Actual price must be 0 or greater');
      return;
    }

    if (!formData.quantity || Number(formData.quantity) < 0.01) {
      setFormError('Quantity must be greater than 0');
      return;
    }

    if (!formData.saleDate) {
      setFormError('Sale date is required');
      return;
    }

    // ✅ Check inventory availability before creating sale
    const productName = formData.productName.trim();
    const quantity = Number(formData.quantity);
    const availability = checkProductAvailability(productName, quantity);

    if (!availability.available) {
      const matchingItem = inventoryItems.find(item => 
        item.name.toLowerCase().trim() === productName.toLowerCase().trim()
      );
      const unitLabel = matchingItem?.unit || 'units';
      
      setStockAlert({
        type: 'error',
        message: `❌ Insufficient stock! "${productName}" has only ${availability.currentStock} ${unitLabel} available, but you're trying to sell ${quantity} ${unitLabel}.`
      });
      setFormError('Product not available in inventory');
      return;
    }

    // Show warning if stock is low
    if (availability.currentStock > 0 && availability.currentStock < quantity * 2) {
      const matchingItem = inventoryItems.find(item => 
        item.name.toLowerCase().trim() === productName.toLowerCase().trim()
      );
      const unitLabel = matchingItem?.unit || 'units';
      
      setStockAlert({
        type: 'warning',
        message: `⚠️ Low stock alert! "${productName}" has only ${availability.currentStock} ${unitLabel} remaining after this sale.`
      });
    } else {
      setStockAlert(null);
    }

    setFormLoading(true);

    try {
      const body: any = {
        productName: productName,
        actualPrice: Number(formData.actualPrice),
        sellingPrice: Number(formData.sellingPrice),
        quantity: quantity,
        saleDate: formData.saleDate,
      };

      if (formData.clientId) {
        body.clientId = formData.clientId;
      }

      if (formData.notes.trim()) {
        body.notes = formData.notes.trim();
      }

      const res = await fetch('/api/product-sales', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // ✅ Deduct from inventory if product exists
        if (availability.currentStock > 0) {
          await deductFromInventory(productName, quantity);
        }

        showNotification('success', 'Product sale added successfully');
        setShowForm(false);
        setFormData({
          clientId: '',
          productName: '',
          actualPrice: '',
          sellingPrice: '',
          quantity: '1',
          notes: '',
          saleDate: new Date().toISOString().split('T')[0],
        });
        setStockAlert(null);
        // Refresh data
        const controller = new AbortController();
        abortControllerRef.current = controller;
        await Promise.all([
          fetchSummary(controller.signal),
          fetchTodaySales(controller.signal),
          fetchSales(controller.signal),
        ]);
      } else if (res.status === 401) {
        router.push('/login');
      } else {
        const error = await res.json();
        setFormError(error.error || 'Failed to add product sale');
      }
    } catch (err) {
      console.error('Error saving product sale:', err);
      setFormError('Failed to add product sale');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/product-sales/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        setSales(sales.filter(sale => sale.id !== id));
        showNotification('success', 'Product sale deleted successfully');
        setShowDeleteConfirm(null);
        // Refresh summary
        const controller = new AbortController();
        abortControllerRef.current = controller;
        fetchSummary(controller.signal);
        fetchTodaySales(controller.signal);
      } else if (res.status === 401) {
        router.push('/login');
      } else {
        const error = await res.json();
        showNotification('error', error.error || 'Failed to delete product sale');
      }
    } catch (err) {
      console.error('Error deleting product sale:', err);
      showNotification('error', 'An error occurred while deleting');
    } finally {
      setDeletingId(null);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && !sales.length) {
    return <ProductSalesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in backdrop-blur-xl border
          ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : ''}
          ${notification.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : ''}
          ${notification.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : ''}`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Product Sale?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this product sale? The other income calculation will be updated accordingly.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId !== null}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deletingId ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Product Sales
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Track device sales and calculate other income from margins
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Add Sale
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Total Other Income */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Total Other Income</p>
            <div className={`p-2 rounded-xl ${
              summary.totalOtherIncome >= 0
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
            }`}>
              {summary.totalOtherIncome >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
          </div>
          {summaryLoading ? (
            <div className="h-8 w-32 bg-slate-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <div className={`text-2xl font-bold ${
              summary.totalOtherIncome >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatPKR(summary.totalOtherIncome)}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">{summary.count} sales</p>
        </div>

        {/* Other Sales Count */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Other Sales</p>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          {summaryLoading ? (
            <div className="h-8 w-20 bg-slate-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {summary.count}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">All time</p>
        </div>

        {/* Today's Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Today's Sales</p>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {todaySales}
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
            {new Date().toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search products, clients, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:text-white dark:placeholder-gray-500 transition-all"
            />
          </div>

          <div className="relative sm:w-48">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm appearance-none cursor-pointer dark:text-white transition-all"
            >
              <option value="all">All Clients</option>
              {clientsLoading ? (
                <option value="" disabled>Loading...</option>
              ) : (
                clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:text-white transition-all"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:text-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/60 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Sales History</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredSales.length)} of {filteredSales.length}
              </p>
            </div>
          </div>
          <div className="text-sm font-medium text-slate-600 dark:text-gray-300">
            Page Total: <span className={`font-bold ${pageTotalOtherIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatPKR(pageTotalOtherIncome)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-gray-900/50 dark:to-gray-800/30">
              <tr className="text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Client</th>
                <th className="px-6 py-3.5">Actual</th>
                <th className="px-6 py-3.5">Selling</th>
                <th className="px-6 py-3.5">Qty</th>
                <th className="px-6 py-3.5">Profit/Loss</th>
                <th className="px-6 py-3.5 hidden lg:table-cell">Notes</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-slate-200/60 dark:divide-gray-700">
              {paginatedSales.length > 0 ? (
                paginatedSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-linear-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent transition-all duration-200"
                  >
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300 text-sm whitespace-nowrap">
                      {formatDate(sale.saleDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-slate-800 dark:text-white text-sm">{sale.productName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300 text-sm">
                      {sale.client ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sale.client.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300 text-sm font-medium">
                      {formatPKR(sale.actualPrice)}
                    </td>
                    <td className="px-6 py-4 text-slate-800 dark:text-white text-sm font-semibold">
                      {formatPKR(sale.sellingPrice)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-gray-300 text-sm font-medium text-center">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 font-semibold text-sm ${
                        sale.totalOtherIncome >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {sale.totalOtherIncome >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {formatPKR(sale.totalOtherIncome)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-gray-400 text-sm hidden lg:table-cell max-w-50 truncate">
                      {sale.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(sale.id)}
                          disabled={deletingId === sale.id}
                          className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete sale"
                        >
                          {deletingId === sale.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-gray-500">
                      <div className="p-4 bg-linear-to-br from-slate-100 to-slate-200/70 dark:from-gray-700 dark:to-gray-600/50 rounded-2xl">
                        <Package className="w-10 h-10 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-600 dark:text-gray-300">No product sales found</p>
                        <p className="text-sm mt-1 text-slate-500 dark:text-gray-400">
                          {searchTerm || clientFilter !== 'all' || dateRange.start || dateRange.end
                            ? 'Try adjusting your filters'
                            : 'Add your first product sale'}
                        </p>
                      </div>
                      {!searchTerm && clientFilter === 'all' && !dateRange.start && !dateRange.end && (
                        <button
                          onClick={() => setShowForm(true)}
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add Sale
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200/60 dark:border-gray-700 bg-linear-to-r from-slate-50/50 to-transparent dark:from-gray-900/30 dark:to-transparent flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                          : 'border border-slate-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-slate-600 dark:text-gray-300">
              {filteredSales.length} total
            </div>
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      {showForm && (
        <AddSaleModal
          formData={formData}
          clients={clients}
          clientsLoading={clientsLoading}
          formLoading={formLoading}
          formError={formError}
          unitProfit={unitProfit}
          totalOtherIncome={totalOtherIncome}
          inventoryItems={inventoryItems}
          inventoryLoading={inventoryLoading}
          stockAlert={stockAlert}
          onClose={() => {
            setShowForm(false);
            setFormError(null);
            setStockAlert(null);
            setFormData({
              clientId: '',
              productName: '',
              actualPrice: '',
              sellingPrice: '',
              quantity: '1',
              notes: '',
              saleDate: new Date().toISOString().split('T')[0],
            });
          }}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

// Add Sale Modal Component
function AddSaleModal({
  formData,
  clients,
  clientsLoading,
  formLoading,
  formError,
  unitProfit,
  totalOtherIncome,
  inventoryItems,
  inventoryLoading,
  stockAlert,
  onClose,
  onChange,
  onSubmit,
}: {
  formData: SaleFormData;
  clients: { id: string; name: string }[];
  clientsLoading: boolean;
  formLoading: boolean;
  formError: string | null;
  unitProfit: number;
  totalOtherIncome: number;
  inventoryItems: Array<{ id: string; name: string; quantity: number; unit: string; unitPrice: number }>;
  inventoryLoading: boolean;
  stockAlert: { type: 'warning' | 'error' | 'success'; message: string } | null;
  onClose: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  // Get the unit for the selected product
  const selectedProductUnit = inventoryItems.find(
    item => item.name.toLowerCase().trim() === formData.productName.toLowerCase().trim()
  )?.unit || 'unit';

  // Check if actualPrice is auto-filled from inventory
  const isAutoFilled = !!inventoryItems.find(
    item => item.name.toLowerCase().trim() === formData.productName.toLowerCase().trim()
  ) && !!formData.actualPrice;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/80 dark:border-gray-700/80">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-linear-to-r from-blue-50/50 to-white dark:from-blue-900/20 dark:to-gray-800/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Add Product Sale
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Product Name with Searchable Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <SearchableProductSelect
              inventoryItems={inventoryItems}
              value={formData.productName}
              onChange={(value) => {
                // Set the product name
                onChange({
                  target: { name: 'productName', value }
                } as React.ChangeEvent<HTMLInputElement>);

                // Auto-populate actualPrice from inventory unitPrice
                const matchedItem = inventoryItems.find(
                  item => item.name.toLowerCase().trim() === value.toLowerCase().trim()
                );
                if (matchedItem) {
                  onChange({
                    target: { name: 'actualPrice', value: matchedItem.unitPrice.toString() }
                  } as React.ChangeEvent<HTMLInputElement>);
                } else {
                  // Clear actualPrice if product not in inventory
                  onChange({
                    target: { name: 'actualPrice', value: '' }
                  } as React.ChangeEvent<HTMLInputElement>);
                }
              }}
              placeholder="Type to search or add new product..."
            />
            {/* Stock availability indicator */}
            {formData.productName && (
              <StockIndicator
                productName={formData.productName}
                quantity={Number(formData.quantity) || 0}
                inventoryItems={inventoryItems}
                inventoryLoading={inventoryLoading}
              />
            )}
          </div>

          {/* Client (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Client <span className="text-slate-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={onChange}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer dark:text-white"
            >
              <option value="">No client assigned</option>
              {clientsLoading ? (
                <option value="" disabled>Loading clients...</option>
              ) : (
                clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Actual Price & Selling Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Actual Price <span className="text-slate-400 dark:text-gray-500 font-normal">(cost per {selectedProductUnit})</span>
                {isAutoFilled && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">✓ Auto-filled</span>
                )}
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="number"
                  name="actualPrice"
                  value={formData.actualPrice}
                  onChange={onChange}
                  readOnly={isAutoFilled}
                  required
                  min="0"
                  step="0.01"
                  className={`w-full pl-9 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white dark:placeholder-gray-500 ${
                    isAutoFilled
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Selling Price <span className="text-slate-400 dark:text-gray-500 font-normal">(per {selectedProductUnit})</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={onChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white dark:placeholder-gray-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Quantity & Sale Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Quantity <span className="text-slate-400 dark:text-gray-500 font-normal">({selectedProductUnit}s)</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={onChange}
                required
                min="0.01"
                step="0.01"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                placeholder="1.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Sale Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="saleDate"
                value={formData.saleDate}
                onChange={onChange}
                required
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
              />
            </div>
          </div>

          {/* Live Profit Preview */}
          {(formData.actualPrice || formData.sellingPrice || formData.quantity !== '1') && (
            <div className="p-4 bg-slate-50 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-700 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">
                Profit Preview
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-gray-400">Unit Profit:</span>
                <span className={`font-semibold ${unitProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatPKR(unitProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-gray-400">Total Other Income:</span>
                <span className={`font-bold ${totalOtherIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatPKR(totalOtherIncome)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Notes <span className="text-slate-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={onChange}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none dark:text-white dark:placeholder-gray-500"
              placeholder="Additional details about this sale..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Adding...</>
              ) : (
                <><Plus className="w-4 h-4" /> Add Sale</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Local formatter for preview
function formatPKR(amount: number) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Stock Indicator Component
function StockIndicator({ 
  productName, 
  quantity, 
  inventoryItems, 
  inventoryLoading 
}: { 
  productName: string; 
  quantity: number;
  inventoryItems: Array<{ id: string; name: string; quantity: number; unit: string; unitPrice: number }>;
  inventoryLoading: boolean;
}) {
  const normalizedProductName = productName.toLowerCase().trim();
  const matchingItem = inventoryItems.find(item => 
    item.name.toLowerCase().trim() === normalizedProductName
  );

  if (inventoryLoading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span>Checking stock...</span>
      </div>
    );
  }

  if (!matchingItem) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Not in inventory - will be treated as a service</span>
      </div>
    );
  }

  const isAvailable = matchingItem.quantity >= quantity;
  const isLowStock = matchingItem.quantity < quantity * 2;
  const unitLabel = matchingItem.unit || 'piece';

  if (isAvailable && isLowStock) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Low stock: {matchingItem.quantity} {unitLabel}(s) available</span>
      </div>
    );
  }

  if (isAvailable) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>In stock: {matchingItem.quantity} {unitLabel}(s) available</span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span>Out of stock: Only {matchingItem.quantity} {unitLabel}(s) available</span>
    </div>
  );
}

// Searchable Product Select Component
function SearchableProductSelect({
  inventoryItems,
  value,
  onChange,
  placeholder,
}: {
  inventoryItems: Array<{ id: string; name: string; quantity: number; unit: string; unitPrice: number }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter inventory items based on search query
  const filteredItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle selecting an item
  const handleSelect = (itemName: string) => {
    onChange(itemName);
    setSearchQuery(itemName);
    setIsOpen(false);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          required
          className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white dark:placeholder-gray-500"
          placeholder={placeholder || "Type to search or add new product..."}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && filteredItems.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.name)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                item.name === value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Stock: {item.quantity} {item.unit}(s) • Rs. {item.unitPrice}/{item.unit}
                  </p>
                </div>
                {item.name === value && (
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message when searching */}
      {isOpen && searchQuery && filteredItems.length === 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No products found. Typing will create a new product.
          </p>
        </div>
      )}
    </div>
  );
}

// Skeleton Loading Component
function ProductSalesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-gray-700 rounded-xl" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[1, 2, 3].map((item) => (
          <div key={item} className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-slate-200/60 dark:border-gray-700">
            <div className="flex justify-between items-start mb-3">
              <div className="h-4 w-32 bg-slate-100 dark:bg-gray-700 rounded" />
              <div className="w-10 h-10 bg-slate-100 dark:bg-gray-700 rounded-xl" />
            </div>
            <div className="h-8 w-24 bg-slate-200 dark:bg-gray-600 rounded" />
            <div className="h-3 w-16 bg-slate-100 dark:bg-gray-700 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-slate-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-48 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="flex gap-2">
            <div className="w-36 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
            <div className="w-36 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <div className="h-5 w-32 bg-slate-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-100 dark:bg-gray-900 rounded" />
                <div className="h-3 w-24 bg-slate-50 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-16 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
