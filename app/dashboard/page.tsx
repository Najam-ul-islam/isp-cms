// app/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Users,
  UserCheck,
  UserX,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  AlertTriangle,
  Shield,
  User,
  Plus,
  CreditCard,
  Receipt,
  Mail,
} from "lucide-react";
import DashboardStatsBlock from "@/components/dashboard/DashboardStatsBlock";
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import OtherIncomeCard from "@/components/dashboard/OtherIncomeCard";

// ─────────────────────────────────────────────────────────────
// Types (Match your API response structure)
// ─────────────────────────────────────────────────────────────
interface StatsData {
  totalClients?: number;
  activeClients?: number;
  expiredClients?: number;
  suspendedClients?: number;
  unpaidClients?: number;
  totalRevenue?: number;
  totalUsers?: number;
  activeUsers?: number;
  expiredUsers?: number;
  suspendedUsers?: number;
  expireToday?: number;
  expireNext3Days?: number;
  expireNext7Days?: number;
  paidToday?: number;
  dueToday?: number;
  dueNext7Days?: number;
  totalExpenses?: number;
  netProfit?: number;
  todayRecovery?: number;
  todayExpenses?: number;
  otherIncome?: number;
  pendingRecovery?: number;
  newUsersToday?: number;
  expiringToday?: number;
  totalReceivable?: number;
  totalPayable?: number;
  netBalance?: number;
  rechargeTarget?: number;
  // Financial summary fields
  financialRevenue?: number;
  financialPayable?: number;
  financialArrears?: number;
  financialTodaysRecovery?: number;
  financialTodaysExpense?: number;
  areaInsights?: Array<{
    areaName: string;
    totalClients: number;
    activeClients: number;
    expiredClients: number;
  }>;
  totalInventoryItems?: number;
  lowStockItems?: number;
  totalInventoryValue?: number;
  totalEmployees?: number;
  employeeRoles?: Array<{
    role: string;
    _count: { _all: number };
  }>;
  recentActivities?: Array<{
    id: string;
    type: "payment" | "client" | "complaint";
    title: string;
    description: string;
    timestamp: string;
    status?: string;
  }>;
  [key: string]: unknown;
}

interface ExpiringClient {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone: string;
  package: string;
  expiryDate: string;
  daysLeft: number;
}

interface DashboardData {
  stats: StatsData | null;
  expiringClients: ExpiringClient[];
  error: string | null;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    stats: null,
    expiringClients: [],
    error: null,
    isLoading: true,
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Refs for cleanup & preventing race conditions
  const isMounted = useRef(true);
  const hasRedirected = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─────────────────────────────────────────────────────────
  // Single Fetch Function (uses httpOnly cookies - NO localStorage)
  // ─────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [overviewRes, expiringRes, financialRes] = await Promise.all([
        fetch("/api/dashboard/overview", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          signal,
        }),
        fetch("/api/dashboard/expiring_clients", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          signal,
        }),
        fetch("/api/dashboard/financial-summary", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          signal,
        }),
      ]);

      if (overviewRes.status === 401 || overviewRes.status === 403) {
        throw new Error("AUTH_ERROR");
      }
      if (expiringRes.status === 401 || expiringRes.status === 403) {
        throw new Error("AUTH_ERROR");
      }

      const overviewData = await overviewRes.json().catch(() => ({}));
      const expiringData = await expiringRes.json().catch(() => []);
      const financialData = await financialRes.json().catch(() => ({}));

      // Merge financial data into stats
      const mergedStats = {
        ...overviewData,
        financialRevenue: financialData.totalRevenue || 0,
        financialPayable: financialData.totalPayable || 0,
        financialArrears: financialData.totalArrears || 0,
        financialTodaysRecovery: financialData.todaysRecovery || 0,
        financialTodaysExpense: financialData.todaysExpense || 0,
      };

      return {
        stats: mergedStats as StatsData,
        expiringClients: Array.isArray(expiringData) ? expiringData : [],
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      if (error instanceof Error && error.message === "AUTH_ERROR") {
        throw error;
      }
      console.error("Dashboard fetch error:", error);
      throw error;
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Auth Failure Handler - Redirect ONCE
  // ─────────────────────────────────────────────────────────
  const handleAuthFailure = useCallback(() => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    router.replace("/login?redirect=/dashboard");
  }, [router]);

  // ─────────────────────────────────────────────────────────
  // Load Data Function
  // ─────────────────────────────────────────────────────────
  const loadDashboardData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await fetchDashboardData(signal);

      if (!isMounted.current) return;

      setData({
        stats: result.stats,
        expiringClients: result.expiringClients,
        error: null,
        isLoading: false,
      });
      setLastUpdated(new Date());
    } catch (error) {
      if (!isMounted.current) return;
      if (error instanceof Error && error.name === "AbortError") return;

      if (error instanceof Error && error.message === "AUTH_ERROR") {
        handleAuthFailure();
        return;
      }

      setData((prev) => ({
        ...prev,
        error: "Failed to load dashboard data",
        isLoading: false,
      }));
    }
  }, [fetchDashboardData, handleAuthFailure]);

  // ─────────────────────────────────────────────────────────
  // Initial Load + Auto-Refresh Setup
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    hasRedirected.current = false;

    loadDashboardData();

    // Set up auto-refresh with proper cleanup
    refreshIntervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        // Always call loadDashboardData when tab is visible
        // The function itself has abort logic to prevent duplicates
        loadDashboardData();
      }
    }, 30000);

    // Refresh data when window regains focus (e.g., after navigating back from another page)
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        loadDashboardData();
      }
    };

    // Listen for popstate events (browser back/forward navigation)
    const handlePopState = () => {
      loadDashboardData();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("popstate", handlePopState);

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [loadDashboardData]);

  // ─────────────────────────────────────────────────────────
  // Real-time Updates via Server-Sent Events
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/dashboard/stream');

        eventSource.onopen = () => {
          console.log('[Dashboard] Connected to real-time updates');
          reconnectAttempts = 0; // Reset on successful connection
        };

        eventSource.addEventListener('connected', (event) => {
          const data = JSON.parse(event.data);
          console.log('[Dashboard] SSE connected:', data.message);
        });

        eventSource.onmessage = (event) => {
          try {
            const dashboardEvent = JSON.parse(event.data);
            console.log('[Dashboard] Received event:', dashboardEvent.type);

            // Handle different event types
            switch (dashboardEvent.type) {
              case 'payment_created':
                console.log('[Dashboard] New payment received:', dashboardEvent.data);
                if (document.visibilityState === 'visible') {
                  loadDashboardData();
                }
                break;

              case 'expense_created':
                console.log('[Dashboard] New expense created:', dashboardEvent.data);
                if (document.visibilityState === 'visible') {
                  loadDashboardData();
                }
                break;

              case 'client_created':
                console.log('[Dashboard] New client created:', dashboardEvent.data);
                if (document.visibilityState === 'visible') {
                  loadDashboardData();
                }
                break;

              case 'client_updated':
              case 'client_expired':
              case 'complaint_created':
              case 'complaint_updated':
                if (document.visibilityState === 'visible') {
                  loadDashboardData();
                }
                break;
            }
          } catch (error) {
            console.error('[Dashboard] Error parsing SSE event:', error);
          }
        };

        eventSource.onerror = (error) => {
          // EventSource readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
          const readyState = eventSource?.readyState;
          
          if (readyState === 2) {
            // Connection was closed
            console.warn('[Dashboard] SSE connection closed');
            return;
          }

          // Only log error if it's not a normal reconnect
          if (readyState === 0) {
            console.debug('[Dashboard] SSE connecting...');
            return;
          }

          // readyState === 1 means connection was open and now errored
          reconnectAttempts++;
          
          if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            console.error('[Dashboard] Max SSE reconnection attempts reached. Please refresh the page.');
            eventSource?.close();
            return;
          }

          console.warn(`[Dashboard] SSE connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, error);
          eventSource?.close();

          // Exponential backoff: 2s, 4s, 8s, max 30s
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), 30000);
          
          reconnectTimeout = setTimeout(() => {
            if (isMounted.current && document.visibilityState === 'visible') {
              console.log(`[Dashboard] Reconnecting to SSE (attempt ${reconnectAttempts})...`);
              connectSSE();
            }
          }, delay);
        };
      } catch (error) {
        console.error('[Dashboard] Failed to create SSE connection:', error);
      }
    };

    connectSSE();

    // Handle page visibility changes - reconnect when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!eventSource || eventSource.readyState === 2) {
          console.log('[Dashboard] Page visible, reconnecting SSE...');
          connectSSE();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [loadDashboardData]);

  // ─────────────────────────────────────────────────────────
  // Manual Refresh Handler
  // ─────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (data.isLoading) return;
    await loadDashboardData();
  };

  // ─────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────
  if (data.isLoading && !data.stats) {
    return <DashboardSkeleton />;
  }

  // ─────────────────────────────────────────────────────────
  // Error State
  // ─────────────────────────────────────────────────────────
  if (data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-8 max-w-md text-center">
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 inline-block mx-auto mb-4">
            <AlertCircle className="w-12 h-12 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{data.error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg
                       border border-transparent hover:border-blue-400/60 dark:hover:border-blue-300/60
                       hover:bg-blue-600 dark:hover:bg-blue-500
                       hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20
                       transition-all duration-200 ease-out font-medium
                       focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Render Dashboard UI
  // ─────────────────────────────────────────────────────────
  const stats = data.stats || {};
  const expiringClients = data.expiringClients || [];

  // Quick actions config for header buttons
  const headerActions = [
    {
      label: "Add Client",
      icon: <Plus className="w-3.5 h-3.5" />,
      href: "/dashboard/clients/new",
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      label: "Payments",
      icon: <CreditCard className="w-3.5 h-3.5" />,
      href: "/dashboard/payments",
      color: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      label: "Reports",
      icon: <Receipt className="w-3.5 h-3.5" />,
      href: "/dashboard/reports",
      color: "bg-violet-600 hover:bg-violet-700",
    },
    {
      label: "Packages",
      icon: <Package className="w-3.5 h-3.5" />,
      href: "/dashboard/packages",
      color: "bg-amber-500 hover:bg-amber-600",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 -m-4 sm:-m-6 lg:-m-8">
      {/* Top Header Bar - UPDATED with Quick Action Buttons */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border-b border-gray-200/60 dark:border-gray-700/60 px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3 sm:gap-0">
          <div className="lg:pl-0 pl-12">
            <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-gray-50 dark:to-gray-300 bg-clip-text text-transparent">
              Dashboard
            </h1>
            {/* <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Welcome back! Here's what's happening with your ISP today.
            </p> */}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            {/* Quick Action Buttons - Moved from body to header */}
            <div className="hidden lg:flex items-center gap-2 mr-2 sm:mr-4">
              {headerActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-xl
                              border border-transparent hover:border-white/30
                              hover:shadow-md hover:-translate-y-0.5
                              transition-all duration-200 ease-out
                              whitespace-nowrap h-8 ${action.color}`}
                  title={action.label}
                >
                  {action.icon}
                  <span className="hidden xl:inline">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Mobile: Dropdown for quick actions */}
            <div className="lg:hidden">
              <select
                onChange={(e) => {
                  if (e.target.value) router.push(e.target.value);
                  e.target.value = "";
                }}
                className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200/60 dark:border-gray-600/60 rounded-lg px-2 py-1.5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                defaultValue=""
              >
                <option value="" disabled>
                  Quick Actions
                </option>
                {headerActions.map((action) => (
                  <option key={action.label} value={action.href}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200/60 dark:border-gray-600/60 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4" />
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 border border-transparent hover:border-gray-200/60 dark:hover:border-gray-600/60 rounded-lg transition-all duration-200 ease-out group"
                title="Refresh data"
                disabled={data.isLoading}
              >
                <RefreshCw
                  className={`w-4 sm:w-5 h-4 sm:h-5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 ${
                    data.isLoading ? "animate-spin" : ""
                  }`}
                />
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-indigo-500/25">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* ✅ TWO-COLUMN LAYOUT: User Overview + Real-Time Stats */}
                {/* ✅ TWO-COLUMN LAYOUT: User Overview + Real-Time Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* User Overview Section - HIDDEN, replaced by DashboardStatsBlock */}
          {/* <Section title="User Overview" icon={<Users className="w-5 h-5" />} className="border-2 border-[#28354a50] bg-[#f7f7f7] p-2 rounded-xl">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <StatCard
                title="Total Users"
                value={stats.totalUsers ?? stats.totalClients ?? 0}
                icon={<Users className="w-6 h-6" />}
                color="blue"
                onClick={() => router.push("/dashboard/clients")}
              />
              <StatCard
                title="Active Users"
                value={stats.activeUsers ?? stats.activeClients ?? 0}
                icon={<UserCheck className="w-6 h-6" />}
                color="emerald"p
                onClick={() => router.push("/dashboard/clients?status=active")}
              />
              <StatCard
                title="Expired Users"
                value={stats.expiredUsers ?? stats.expiredClients ?? 0}
                icon={<UserX className="w-6 h-6" />}
                color="rose"
                onClick={() => router.push("/dashboard/clients?status=expired")}
              />
              <StatCard
                title="New Users Today"
                value={stats.newUsersToday ?? 0}
                icon={<Plus className="w-6 h-6" />}
                color="purple"
                onClick={() => router.push("/dashboard/clients")}
              />
            </div>
          </Section> */}

          {/* Dashboard Stats Block - Replaces User Overview */}
          <DashboardStatsBlock
            rechargeTarget={`Rs ${(stats.rechargeTarget ?? stats.totalPayable ?? 0).toLocaleString()}`}
            totalClients={stats.totalClients ?? stats.totalUsers ?? 0}
            activeClients={stats.activeClients ?? stats.activeUsers ?? 0}
            newClients={stats.newUsersToday ?? 0}
            disabledClients={stats.expiredClients ?? stats.expiredUsers ?? 0}
            expiredClients={stats.expiredClients ?? stats.expiredUsers ?? 0}
            suspendedClients={stats.suspendedClients ?? stats.suspendedUsers ?? 0}
            unpaidClients={stats.unpaidClients ?? 0}
          />

          {/* Real-Time Stats Section - 4 Cards */}
          <Section
            title="Real-Time Stats"
            icon={<TrendingUp className="w-5 h-5" />}
            variant="success"
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5"
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              <button
                onClick={() => router.push("/dashboard/payments")}
                className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-left border border-emerald-200/60 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                aria-label={`Today's Recovery: Rs ${(stats.financialTodaysRecovery ?? stats.todayRecovery ?? stats.paidToday ?? 0).toLocaleString()}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today&apos;s Recovery</p>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 transition-transform duration-200 group-hover:scale-110">
                    <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-semibold bg-linear-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
                  Rs {(stats.financialTodaysRecovery ?? stats.todayRecovery ?? stats.paidToday ?? 0).toLocaleString()}
                </p>
              </button>
              <button
                onClick={() => router.push("/dashboard/expenses")}
                className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-left border border-rose-200/60 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50/80 dark:hover:bg-rose-500/5 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                aria-label={`Today's Expense: Rs ${(stats.financialTodaysExpense ?? stats.todayExpenses ?? 0).toLocaleString()}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today&apos;s Expense</p>
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 transition-transform duration-200 group-hover:scale-110">
                    <ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                </div>
                <p className="text-2xl font-semibold bg-linear-to-r from-rose-600 to-rose-500 dark:from-rose-400 dark:to-rose-300 bg-clip-text text-transparent">
                  Rs {(stats.financialTodaysExpense ?? stats.todayExpenses ?? 0).toLocaleString()}
                </p>
              </button>
              <OtherIncomeCard />
              <button
                onClick={() => router.push("/dashboard/payments?filter=due")}
                className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-left border border-amber-200/60 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 hover:bg-amber-50/80 dark:hover:bg-amber-500/5 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                aria-label={`Pending Recovery: Rs ${(stats.pendingRecovery ?? 0).toLocaleString()}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Recovery</p>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 transition-transform duration-200 group-hover:scale-110">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-2xl font-semibold bg-linear-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
                  Rs {(stats.pendingRecovery ?? 0).toLocaleString()}
                </p>
              </button>
            </div>
          </Section>
        </div>

{/* FINANCIAL SUMMARY - Uses accurate financial data from new endpoint */}
<FinancialSummary
  totalRevenue={`Rs ${(stats.financialRevenue ?? 0).toLocaleString()}`}
  totalExpenses={`Rs ${(stats.totalExpenses ?? 0).toLocaleString()}`}
  totalArrears={`Rs ${(stats.financialArrears ?? 0).toLocaleString()}`}
  totalPayable={`Rs ${(stats.financialPayable ?? 0).toLocaleString()}`}
  totalReceivable={`Rs ${(stats.totalReceivable ?? 0).toLocaleString()}`}
/>

        {/* {/* CHARTS SECTION */}
        {/* <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <ChartPlaceholder title="Revenue vs Expenses (Monthly)" />
          <ChartPlaceholder title="New Users Growth" />
        </div> */}

        {/* AREA INSIGHTS & ACTIVITY */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <AreaInsightsPlaceholder areaInsights={stats.areaInsights ?? []} />
          <ActivityFeedPlaceholder activities={stats.recentActivities ?? []} />
        </div> */}
        {/* EXPIRATION ALERTS */}
        <Section
          title="Expiration Alerts"
          icon={<AlertCircle className="w-5 h-5" />}
          variant="warning"
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <AlertCard
              title="Expiring Today"
              value={stats.expireToday ?? 0}
              urgency="critical"
              message={
                stats.expireToday
                  ? "Immediate action required"
                  : "All clear! 🎉"
              }
              onClick={() => router.push("/dashboard/clients?expiring=today")}
            />
            <AlertCard
              title="Next 3 Days"
              value={stats.expireNext3Days ?? 0}
              urgency="high"
              message="Plan renewals ahead"
              onClick={() => router.push("/dashboard/clients?expiring=3days")}
            />
            <AlertCard
              title="Next 7 Days"
              value={stats.expireNext7Days ?? 0}
              urgency="medium"
              message="Prepare follow-ups"
              onClick={() => router.push("/dashboard/clients?expiring=7days")}
            />
          </div>
        </Section>
        
        {/* INVENTORY OVERVIEW */}
        <Section
          title="Inventory Overview"
          icon={<Package className="w-5 h-5" />}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <InventoryCard
              title="Total Items"
              value={stats.totalInventoryItems ?? 0}
              icon={<Package className="w-6 h-6" />}
              color="blue"
              onClick={() => router.push("/dashboard/inventory")}
            />
            <InventoryCard
              title="Low Stock Items"
              value={stats.lowStockItems ?? 0}
              icon={<AlertTriangle className="w-6 h-6" />}
              color="amber"
              onClick={() => router.push("/dashboard/inventory")}
            />
            <InventoryCard
              title="Total Value"
              value={stats.totalInventoryValue ?? 0}
              icon={<DollarSign className="w-6 h-6" />}
              color="emerald"
              subtitle="Rs"
              onClick={() => router.push("/dashboard/inventory")}
            />
          </div>
        </Section>

        {/* EMPLOYEE OVERVIEW */}
        <Section
        title="Employee Overview"
        icon={<Users className="w-5 h-5" />}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <EmployeeCard
              title="Total Employees"
              value={stats.totalEmployees ?? 0}
              icon={<Users className="w-6 h-6" />}
              color="purple"
              onClick={() => router.push("/dashboard/employees")}
            />
            <EmployeeCard
              title="Admins"
              value={
                stats.employeeRoles?.find((r) => r.role === "ADMIN")?._count
                  ._all ?? 0
              }
              icon={<Shield className="w-6 h-6" />}
              color="indigo"
              onClick={() => router.push("/dashboard/employees")}
            />
            <EmployeeCard
              title="Staff"
              value={
                stats.employeeRoles?.find((r) => r.role === "EMPLOYEE")?._count
                  ._all ?? 0
              }
              icon={<User className="w-6 h-6" />}
              color="blue"
              onClick={() => router.push("/dashboard/employees")}
            />
          </div>
        </Section>



        {/* REVENUE METRICS */}
        <Section
          title="Revenue Overview"
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <FinCard
              title="Paid Today"
              amount={stats.paidToday ?? 0}
              type="income"
              icon={<ArrowUpRight className="w-5 h-5" />}
              onClick={() => router.push("/dashboard/payments")}
            />
            <FinCard
              title="Due Today"
              amount={stats.dueToday ?? 0}
              type="due"
              icon={<Clock className="w-5 h-5" />}
              onClick={() => router.push("/dashboard/payments")}
            />
            <FinCard
              title="Due Next 7 Days"
              amount={stats.dueNext7Days ?? 0}
              type="upcoming"
              icon={<Calendar className="w-5 h-5" />}
              onClick={() => router.push("/dashboard/payments")}
            />
          </div>
        </Section>

        {/* EXPIRING CLIENTS TABLE */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-gray-200/60 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 bg-linear-to-r from-violet-50/50 to-transparent dark:from-violet-500/5 dark:to-transparent">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-500/10 rounded-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-50">
                  Clients Expiring Soon
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Proactive retention opportunities
                </p>
              </div>
            </div>
            <span className="px-2.5 sm:px-3 py-1 bg-violet-100 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs sm:text-sm font-medium rounded-full self-start sm:self-auto">
              {expiringClients.length} clients
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-linear-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {expiringClients.length > 0 ? (
                  expiringClients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-violet-50/50 dark:hover:bg-violet-500/5 transition-colors duration-200 group"
                    >
                      {/* Username */}
                      <td className="px-4 py-3">
                        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                          {client.username || '-'}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-200/60 dark:ring-gray-600/60">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-50 text-sm">
                            {client.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                        {client.phone}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 text-xs rounded-md font-medium">
                          {client.package}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(client.expiryDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge daysLeft={client.daysLeft} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hello ${client.name}, your internet package "${client.package}" will expire on ${new Date(
                                client.expiryDate,
                              ).toLocaleDateString()}. Please renew to avoid service interruption.`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 border border-transparent hover:border-emerald-400/60 rounded-full shadow-sm hover:shadow-md hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                          <a
                            href={`mailto:${client.email}?subject=${encodeURIComponent(
                              "Internet Package Expiry Reminder",
                            )}&body=${encodeURIComponent(
                              `Hello ${client.name},\n\nYour internet package "${client.package}" will expire on ${new Date(
                                client.expiryDate,
                              ).toLocaleDateString()}.\n\nPlease renew your package to avoid service interruption.\n\nThank you.`,
                            )}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 border border-transparent hover:border-indigo-400/60 rounded-full shadow-sm hover:shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                          <UserCheck className="w-12 h-12 opacity-50" />
                        </div>
                        <p className="font-medium text-gray-600 dark:text-gray-400">No expiring clients</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          All your clients are up to date! 🎉
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/60">
            {expiringClients.length > 0 ? (
              expiringClients.map((client) => (
                <div key={client.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-200/60 dark:ring-gray-600/60 shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-50 truncate">{client.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{client.username || '-'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{client.phone}</p>
                    </div>
                    <StatusBadge daysLeft={client.daysLeft} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 rounded-md font-medium">
                      {client.package}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {new Date(client.expiryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hello ${client.name}, your internet package "${client.package}" will expire on ${new Date(
                          client.expiryDate,
                        ).toLocaleDateString()}. Please renew to avoid service interruption.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 border border-transparent hover:border-emerald-400/60 rounded-lg shadow-sm hover:shadow-md hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                    <a
                      href={`mailto:${client.email}?subject=${encodeURIComponent(
                        "Internet Package Expiry Reminder",
                      )}&body=${encodeURIComponent(
                        `Hello ${client.name},\n\nYour internet package "${client.package}" will expire on ${new Date(
                          client.expiryDate,
                        ).toLocaleDateString()}.\n\nPlease renew your package to avoid service interruption.\n\nThank you.`,
                      )}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 border border-transparent hover:border-indigo-400/60 rounded-lg shadow-sm hover:shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                    <UserCheck className="w-12 h-12 opacity-50" />
                  </div>
                  <p className="font-medium text-gray-600 dark:text-gray-400">No expiring clients</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    All your clients are up to date! 🎉
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper Components (Self-contained fallbacks)
// ─────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  variant = "default",
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "warning" | "success";
  className?: string;
}) {
  const variants = {
    default: "from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400",
    warning: "from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400",
    success: "from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400",
  };
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg bg-linear-to-br ${variants[variant]} shadow-md transition-transform duration-200 hover:scale-105`}
        >
          <div className="text-white">{icon}</div>
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
      </div>
      {children}
    </section>
  );
}
function StatCard({
  title,
  value,
  icon,
  color,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "rose" | "amber" | "purple" | "orange" | "indigo" | "violet";
  onClick?: () => void;
}) {
  const colors = {
    blue: {
      bg: "from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-500/5",
      icon: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
      border: "border-blue-200/60 dark:border-blue-500/20",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/40",
      hoverBg: "hover:bg-blue-50/80 dark:hover:bg-blue-500/5",
      shadow: "hover:shadow-blue-500/10",
      valueGradient: "from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5",
      icon: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200/60 dark:border-emerald-500/20",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
      hoverBg: "hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5",
      shadow: "hover:shadow-emerald-500/10",
      valueGradient: "from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300",
    },
    rose: {
      bg: "from-rose-50 to-rose-100/50 dark:from-rose-500/10 dark:to-rose-500/5",
      icon: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
      border: "border-rose-200/60 dark:border-rose-500/20",
      hoverBorder: "hover:border-rose-300 dark:hover:border-rose-500/40",
      hoverBg: "hover:bg-rose-50/80 dark:hover:bg-rose-500/5",
      shadow: "hover:shadow-rose-500/10",
      valueGradient: "from-rose-600 to-rose-500 dark:from-rose-400 dark:to-rose-300",
    },
    amber: {
      bg: "from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-500/5",
      icon: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
      border: "border-amber-200/60 dark:border-amber-500/20",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
      hoverBg: "hover:bg-amber-50/80 dark:hover:bg-amber-500/5",
      shadow: "hover:shadow-amber-500/10",
      valueGradient: "from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300",
    },
    purple: {
      bg: "from-violet-50 to-violet-100/50 dark:from-violet-500/10 dark:to-violet-500/5",
      icon: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
      border: "border-violet-200/60 dark:border-violet-500/20",
      hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/40",
      hoverBg: "hover:bg-violet-50/80 dark:hover:bg-violet-500/5",
      shadow: "hover:shadow-violet-500/10",
      valueGradient: "from-violet-600 to-violet-500 dark:from-violet-400 dark:to-violet-300",
    },
    orange: {
      bg: "from-orange-50 to-orange-100/50 dark:from-orange-500/10 dark:to-orange-500/5",
      icon: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400",
      border: "border-orange-200/60 dark:border-orange-500/20",
      hoverBorder: "hover:border-orange-300 dark:hover:border-orange-500/40",
      hoverBg: "hover:bg-orange-50/80 dark:hover:bg-orange-500/5",
      shadow: "hover:shadow-orange-500/10",
      valueGradient: "from-orange-600 to-orange-500 dark:from-orange-400 dark:to-orange-300",
    },
    indigo: {
      bg: "from-indigo-50 to-indigo-100/50 dark:from-indigo-500/10 dark:to-indigo-500/5",
      icon: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200/60 dark:border-indigo-500/20",
      hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-500/40",
      hoverBg: "hover:bg-indigo-50/80 dark:hover:bg-indigo-500/5",
      shadow: "hover:shadow-indigo-500/10",
      valueGradient: "from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300",
    },
    violet: {
      bg: "from-violet-50 to-violet-100/50 dark:from-violet-500/10 dark:to-violet-500/5",
      icon: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
      border: "border-violet-200/60 dark:border-violet-500/20",
      hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/40",
      hoverBg: "hover:bg-violet-50/80 dark:hover:bg-violet-500/5",
      shadow: "hover:shadow-violet-500/10",
      valueGradient: "from-violet-600 to-violet-500 dark:from-violet-400 dark:to-violet-300",
    },
  };
  const c = colors[color];
  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border ${c.border} ${c.hoverBorder} ${c.hoverBg} ${c.shadow} hover:-translate-y-1 transition-all duration-300 group overflow-hidden ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div
        className={`absolute -top-10 -right-10 w-24 h-24 sm:w-32 sm:h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
      />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold bg-linear-to-r ${c.valueGradient} bg-clip-text text-transparent tracking-tight`}>
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${c.icon} shadow-lg transition-transform duration-300 group-hover:scale-110`}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinCard({
  title,
  amount,
  type,
  icon,
  onClick,
}: {
  title: string;
  amount: number;
  type: "income" | "due" | "upcoming";
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const types = {
    income: {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-200/60 dark:border-emerald-500/20",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
      hoverBg: "hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5",
      shadow: "hover:shadow-emerald-500/10",
      valueGradient: "from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300",
      badge: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      statusText: "Received",
    },
    due: {
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-500/10",
      border: "border-rose-200/60 dark:border-rose-500/20",
      hoverBorder: "hover:border-rose-300 dark:hover:border-rose-500/40",
      hoverBg: "hover:bg-rose-50/80 dark:hover:bg-rose-500/5",
      shadow: "hover:shadow-rose-500/10",
      valueGradient: "from-rose-600 to-rose-500 dark:from-rose-400 dark:to-rose-300",
      badge: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
      statusText: "Pending",
    },
    upcoming: {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200/60 dark:border-amber-500/20",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
      hoverBg: "hover:bg-amber-50/80 dark:hover:bg-amber-500/5",
      shadow: "hover:shadow-amber-500/10",
      valueGradient: "from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300",
      badge: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
      statusText: "Forecasted",
    },
  };
  const t = types[type];
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${t.border} ${t.hoverBorder} ${t.hoverBg} ${t.shadow} hover:-translate-y-1 transition-all duration-300 group ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${t.bg} ${t.color} transition-transform duration-300 group-hover:scale-110`}>{icon}</div>
        <TrendingUp className={`w-4 h-4 ${t.color} opacity-60`} />
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className={`text-lg font-bold bg-linear-to-r ${t.valueGradient} bg-clip-text text-transparent`}>
        Rs {amount.toLocaleString("en-PK")}
      </p>
      <div className={`mt-2 pt-2 border-t ${t.border}`}>
        <div className="flex items-center gap-1.5 text-xs">
          <div
            className={`w-1.5 h-1.5 rounded-full ${type === "income" ? "bg-emerald-500" : type === "due" ? "bg-rose-500" : "bg-amber-500"}`}
          />
          <span className={t.color}>
            {t.statusText}
          </span>
        </div>
      </div>
    </div>
  );
}
// function ChartPlaceholder({ title }: { title: string }) {
//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
//       <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
//       <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
//         <p className="text-slate-400 text-sm">Chart component loading...</p>
//       </div>
//     </div>
//   );
// }

// function AreaInsightsPlaceholder({
//   areaInsights,
// }: {
//   areaInsights: Array<{
//     areaName: string;
//     totalClients: number;
//     activeClients: number;
//     expiredClients: number;
//   }>;
// }) {
//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
//       <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//         <Users className="w-5 h-5 text-blue-600" />
//         Area Insights
//       </h3>
//       {areaInsights.length > 0 ? (
//         <div className="space-y-3">
//           {areaInsights.slice(0, 5).map((area) => (
//             <div
//               key={area.areaName}
//               className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
//             >
//               <span className="font-medium text-slate-700">
//                 {area.areaName}
//               </span>
//               <div className="flex items-center gap-4 text-sm">
//                 <span className="text-slate-500">
//                   Total: {area.totalClients}
//                 </span>
//                 <span className="text-emerald-600">
//                   Active: {area.activeClients}
//                 </span>
//                 <span className="text-rose-600">
//                   Expired: {area.expiredClients}
//                 </span>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className="text-slate-400 text-center py-8">
//           No area data available
//         </p>
//       )}
//     </div>
//   );
// }

function ActivityFeedPlaceholder({
  activities,
}: {
  activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-4 sm:p-6">
      <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-500/10">
          <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        Recent Activity
      </h3>
      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 dark:bg-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {activity.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{activity.description}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 dark:text-gray-500 text-center py-8">No recent activity</p>
      )}
    </div>
  );
}

function InventoryCard({
  title,
  value,
  icon,
  color,
  subtitle,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo" | "violet";
  subtitle?: string;
  onClick?: () => void;
}) {
  const colors: Record<string, any> = {
    blue: {
      bg: "from-indigo-50 to-indigo-100/50 dark:from-indigo-500/10 dark:to-indigo-500/5",
      icon: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200/60 dark:border-indigo-500/20",
      hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-500/40",
      hoverBg: "hover:bg-indigo-50/80 dark:hover:bg-indigo-500/5",
      shadow: "hover:shadow-indigo-500/10",
      valueGradient: "from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5",
      icon: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200/60 dark:border-emerald-500/20",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
      hoverBg: "hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5",
      shadow: "hover:shadow-emerald-500/10",
      valueGradient: "from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300",
    },
    rose: {
      bg: "from-rose-50 to-rose-100/50 dark:from-rose-500/10 dark:to-rose-500/5",
      icon: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
      border: "border-rose-200/60 dark:border-rose-500/20",
      hoverBorder: "hover:border-rose-300 dark:hover:border-rose-500/40",
      hoverBg: "hover:bg-rose-50/80 dark:hover:bg-rose-500/5",
      shadow: "hover:shadow-rose-500/10",
      valueGradient: "from-rose-600 to-rose-500 dark:from-rose-400 dark:to-rose-300",
    },
    amber: {
      bg: "from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-500/5",
      icon: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
      border: "border-amber-200/60 dark:border-amber-500/20",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
      hoverBg: "hover:bg-amber-50/80 dark:hover:bg-amber-500/5",
      shadow: "hover:shadow-amber-500/10",
      valueGradient: "from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300",
    },
    purple: {
      bg: "from-violet-50 to-violet-100/50 dark:from-violet-500/10 dark:to-violet-500/5",
      icon: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
      border: "border-violet-200/60 dark:border-violet-500/20",
      hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/40",
      hoverBg: "hover:bg-violet-50/80 dark:hover:bg-violet-500/5",
      shadow: "hover:shadow-violet-500/10",
      valueGradient: "from-violet-600 to-violet-500 dark:from-violet-400 dark:to-violet-300",
    },
    indigo: {
      bg: "from-indigo-50 to-indigo-100/50 dark:from-indigo-500/10 dark:to-indigo-500/5",
      icon: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200/60 dark:border-indigo-500/20",
      hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-500/40",
      hoverBg: "hover:bg-indigo-50/80 dark:hover:bg-indigo-500/5",
      shadow: "hover:shadow-indigo-500/10",
      valueGradient: "from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300",
    },
    violet: {
      bg: "from-violet-50 to-violet-100/50 dark:from-violet-500/10 dark:to-violet-500/5",
      icon: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
      border: "border-violet-200/60 dark:border-violet-500/20",
      hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/40",
      hoverBg: "hover:bg-violet-50/80 dark:hover:bg-violet-500/5",
      shadow: "hover:shadow-violet-500/10",
      valueGradient: "from-violet-600 to-violet-500 dark:from-violet-400 dark:to-violet-300",
    },
  };
  const c = colors[color];
  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${c.border} ${c.hoverBorder} ${c.hoverBg} ${c.shadow} hover:-translate-y-1 transition-all duration-300 group overflow-hidden ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
      />
      <div className="relative flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className={`text-xl font-bold bg-linear-to-r ${c.valueGradient} bg-clip-text text-transparent tracking-tight`}>
            {value.toLocaleString()}
          </p>
          {subtitle && <p className="text-[10px] text-gray-400 dark:text-gray-500">{subtitle}</p>}
        </div>
        <div
          className={`p-2 rounded-lg ${c.icon} shadow-md transition-transform duration-300 group-hover:scale-110`}
        >
          <div className="w-4 h-4">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeCard({
  title,
  value,
  icon,
  color,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo";
  onClick?: () => void;
}) {
  return (
    <InventoryCard
      title={title}
      value={value}
      icon={icon}
      color={color}
      onClick={onClick}
    />
  );
}

function AlertCard({
  title,
  value,
  urgency,
  message,
  onClick,
}: {
  title: string;
  value: number;
  urgency: "critical" | "high" | "medium";
  message: string;
  onClick?: () => void;
}) {
  const urgencies = {
    critical: {
      bg: "from-rose-500 to-pink-500 dark:from-rose-400 dark:to-pink-400",
      ring: "ring-rose-200 dark:ring-rose-800",
      text: "text-rose-600 dark:text-rose-400",
      badge: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
      border: "border-rose-200/60 dark:border-rose-500/20",
      hoverBorder: "hover:border-rose-300 dark:hover:border-rose-500/40",
      hoverBg: "hover:bg-rose-50/80 dark:hover:bg-rose-500/5",
      shadow: "hover:shadow-rose-500/10",
      valueGradient: "from-rose-600 to-rose-500 dark:from-rose-400 dark:to-rose-300",
    },
    high: {
      bg: "from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400",
      ring: "ring-amber-200 dark:ring-amber-800",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
      border: "border-amber-200/60 dark:border-amber-500/20",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
      hoverBg: "hover:bg-amber-50/80 dark:hover:bg-amber-500/5",
      shadow: "hover:shadow-amber-500/10",
      valueGradient: "from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300",
    },
    medium: {
      bg: "from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400",
      ring: "ring-blue-200 dark:ring-blue-800",
      text: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
      border: "border-blue-200/60 dark:border-blue-500/20",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/40",
      hoverBg: "hover:bg-blue-50/80 dark:hover:bg-blue-500/5",
      shadow: "hover:shadow-blue-500/10",
      valueGradient: "from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300",
    },
  };
  const u = urgencies[urgency];
  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${u.border} ${u.hoverBorder} ${u.hoverBg} ${u.shadow} hover:-translate-y-1 transition-all duration-300 overflow-hidden group ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${u.bg}`}
      />
      <div className="flex items-start justify-between mb-2">
        <div className={`p-1.5 rounded-lg ring-2 ${u.ring}`}>
          <AlertCircle className={`w-4 h-4 ${u.text}`} />
        </div>
        {value > 0 && (
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${u.badge}`}
          >
            {value} clients
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-0.5">{title}</h3>
      <p className={`text-xl font-bold bg-linear-to-r ${u.valueGradient} bg-clip-text text-transparent mb-1`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
      {value > 0 && (
        <div className="mt-3 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-linear-to-r ${u.bg} transition-all duration-500`}
            style={{ width: `${Math.min(value * 15, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft <= 0)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
        Expired
      </span>
    );
  if (daysLeft <= 1)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
        {daysLeft} day left
      </span>
    );
  if (daysLeft <= 3)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        {daysLeft} days left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
      {daysLeft} days left
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 animate-pulse">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 border-b border-gray-200/60 dark:border-gray-700/60 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-gray-200/60 dark:bg-gray-700/60 rounded" />
            <div className="h-4 w-72 bg-gray-100/60 dark:bg-gray-700/40 rounded" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-40 bg-gray-100/60 dark:bg-gray-700/40 rounded-full" />
            <div className="w-10 h-10 rounded-full bg-gray-200/60 dark:bg-gray-700/60" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gray-200/60 dark:bg-gray-700/60 rounded-lg" />
              <div className="h-5 w-40 bg-gray-200/60 dark:bg-gray-700/60 rounded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200/60 dark:border-gray-700/60"
                >
                  <div className="flex justify-between">
                    <div className="space-y-3">
                      <div className="h-4 w-24 bg-gray-100/60 dark:bg-gray-700/60 rounded" />
                      <div className="h-8 w-16 bg-gray-200/60 dark:bg-gray-700/60 rounded" />
                      <div className="h-3 w-32 bg-gray-100/60 dark:bg-gray-700/60 rounded" />
                    </div>
                    <div className="w-12 h-12 bg-gray-100/60 dark:bg-gray-700/60 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100/60 dark:border-gray-700/60">
            <div className="h-5 w-48 bg-gray-200/60 dark:bg-gray-700/60 rounded" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-gray-100/60 dark:bg-gray-700/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-100/60 dark:bg-gray-700/60 rounded" />
                  <div className="h-3 w-24 bg-gray-50/60 dark:bg-gray-700/40 rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-100/60 dark:bg-gray-700/60 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}