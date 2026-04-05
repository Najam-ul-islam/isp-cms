// app/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Mail,
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
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types (Match your API response structure)
// ─────────────────────────────────────────────────────────────
interface StatsData {
  totalClients?: number;
  activeClients?: number;
  expiredClients?: number;
  totalRevenue?: number;
  totalUsers?: number;
  activeUsers?: number;
  expiredUsers?: number;
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
  newUsersToday?: number;
  expiringToday?: number;
  totalReceivable?: number;
  totalPayable?: number;
  netBalance?: number;
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
      const [overviewRes, expiringRes] = await Promise.all([
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
      ]);

      if (overviewRes.status === 401 || overviewRes.status === 403) {
        throw new Error("AUTH_ERROR");
      }
      if (expiringRes.status === 401 || expiringRes.status === 403) {
        throw new Error("AUTH_ERROR");
      }

      const overviewData = await overviewRes.json().catch(() => ({}));
      const expiringData = await expiringRes.json().catch(() => []);

      return {
        stats: overviewData as StatsData,
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

    refreshIntervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible" && !data.isLoading) {
        loadDashboardData();
      }
    }, 30000);

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-slate-500 mb-6">{data.error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
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
      icon: <Plus className="w-4 h-4" />,
      href: "/dashboard/clients/new",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "Payment",
      icon: <CreditCard className="w-4 h-4" />,
      href: "/dashboard/payments/new",
      color: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      label: "Reports",
      icon: <Receipt className="w-4 h-4" />,
      href: "/dashboard/reports",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      label: "Packages",
      icon: <Package className="w-4 h-4" />,
      href: "/dashboard/packages",
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
      {/* Top Header Bar - UPDATED with Quick Action Buttons */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto gap-4 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Welcome back! Here's what's happening with your ISP today.
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            {/* Quick Action Buttons - Moved from body to header */}
            <div className="hidden lg:flex items-center gap-1.5 mr-2 sm:mr-4">
              {headerActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all shadow-sm hover:shadow-md ${action.color}`}
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
                className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4" />
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                title="Refresh data"
                disabled={data.isLoading}
              >
                <RefreshCw
                  className={`w-4 sm:w-5 h-4 sm:h-5 text-slate-600 group-hover:text-blue-600 transition-colors ${
                    data.isLoading ? "animate-spin" : ""
                  }`}
                />
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/25">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ✅ TWO-COLUMN LAYOUT: User Overview + Real-Time Stats */}
                {/* ✅ TWO-COLUMN LAYOUT: User Overview + Real-Time Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* User Overview Section - 4 Cards */}
          <Section title="User Overview" icon={<Users className="w-5 h-5" />} className="border-2 border-[#28354a50] bg-[#f7f7f7] p-2 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                color="emerald"
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
          </Section>

          {/* Real-Time Stats Section - 4 Cards */}
          <Section
            title="Real-Time Stats"
            icon={<TrendingUp className="w-5 h-5" />}
            variant="success"
            className="border-2 border-[#00a37c50] bg-[#f7f7f7] p-2 rounded-xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <StatCard
                title="Today's Recovery"
                value={stats.todayRecovery ?? stats.paidToday ?? 0}
                icon={<ArrowUpRight className="w-6 h-6" />}
                color="emerald"
                onClick={() => router.push("/dashboard/payments")}
              />
              <StatCard
                title="Today's Expenses"
                value={stats.todayExpenses ?? 0}
                icon={<Clock className="w-6 h-6" />}
                color="rose"
                onClick={() => router.push("/dashboard/expenses")}
              />
              <StatCard
                title="Expiring Today"
                value={stats.expireToday ?? stats.expiringToday ?? 0}
                icon={<AlertCircle className="w-6 h-6" />}
                color="amber"
                onClick={() => router.push("/dashboard/clients?expiring=today")}
              />
              <StatCard
                title="Expiring Next 3 Days"
                value={stats.expireNext3Days ?? 0}
                icon={<Calendar className="w-6 h-6" />}
                color="orange"
                onClick={() => router.push("/dashboard/clients?expiring=3days")}
              />
            </div>
          </Section>
        </div>

{/* FINANCIAL METRICS - Full width */}
{/* ✅ TWO-COLUMN LAYOUT: Financial Summary + Accounts Summary */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
  {/* Financial Summary Section - 4 Cards */}
  <Section
    title="Financial Summary"
    icon={<DollarSign className="w-5 h-5" />}
    variant="success"
    className="border-2 border-[#00a37c50] bg-[#f7f7f7] p-2 rounded-xl"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <StatCard
        title="Total Revenue"
        value={stats.totalRevenue ?? 0}
        icon={<ArrowUpRight className="w-6 h-6" />}
        color="emerald"
        onClick={() => router.push("/dashboard/payments")}
      />
      <StatCard
        title="Total Expenses"
        value={stats.totalExpenses ?? 0}
        icon={<Clock className="w-6 h-6" />}
        color="rose"
        onClick={() => router.push("/dashboard/expenses")}
      />
      <StatCard
        title="Net Profit"
        value={stats.netProfit ?? 0}
        icon={<TrendingUp className="w-6 h-6" />}
        color={(stats.netProfit ?? 0) >= 0 ? "emerald" : "rose"}
        onClick={() => router.push("/dashboard/payments")}
      />
      <StatCard
        title="Today's Recovery"
        value={stats.todayRecovery ?? stats.paidToday ?? 0}
        icon={<ArrowUpRight className="w-6 h-6" />}
        color="blue"
        onClick={() => router.push("/dashboard/payments")}
      />
    </div>
  </Section>

  {/* Accounts Summary Section - 4 Cards */}
  <Section
    title="Accounts Summary"
    icon={<DollarSign className="w-5 h-5" />}
    variant="default"
    className="border-2 border-[#28354a50] bg-[#f7f7f7] p-2 rounded-xl"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <StatCard
        title="Total Receivable"
        value={stats.totalReceivable ?? 0}
        icon={<ArrowUpRight className="w-6 h-6" />}
        color="emerald"
        onClick={() => router.push("/dashboard/payments")}
      />
      <StatCard
        title="Total Payable"
        value={stats.totalPayable ?? 0}
        icon={<ArrowDownRight className="w-6 h-6" />}
        color="rose"
        onClick={() => router.push("/dashboard/expenses")}
      />
      <StatCard
        title="Net Balance"
        value={stats.netBalance ?? 0}
        icon={<DollarSign className="w-6 h-6" />}
        color={(stats.netBalance ?? 0) >= 0 ? "emerald" : "rose"}
        onClick={() => router.push("/dashboard/payments")}
      />
      <StatCard
        title="Due Next 7 Days"
        value={stats.dueNext7Days ?? 0}
        icon={<Calendar className="w-6 h-6" />}
        color="amber"
        onClick={() => router.push("/dashboard/payments")}
      />
    </div>
  </Section>
</div>

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

        {/* INVENTORY OVERVIEW */}
        <Section
          title="Inventory Overview"
          icon={<Package className="w-5 h-5" />}
          className="border-2 border-[#28354a50] bg-[#f7f7f7] p-2 rounded-xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
        className="border-2 border-[#28354a50] bg-[#f7f7f7] p-2 rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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

        {/* EXPIRATION ALERTS */}
        <Section
          title="Expiration Alerts"
          icon={<AlertCircle className="w-5 h-5" />}
          variant="warning"
          className="border-2 border-[#ea6f0050] bg-[#f7f7f7] p-2 rounded-xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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

        {/* REVENUE METRICS */}
        <Section
          title="Revenue Overview"
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
          className="border-2 border-[#00a37c50] bg-[#f7f7f7] p-2 rounded-xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 bg-linear-to-r from-purple-50/50 to-transparent">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-base sm:font-semibold text-slate-800">
                  Clients Expiring Soon
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Proactive retention opportunities
                </p>
              </div>
            </div>
            <span className="px-2.5 sm:px-3 py-1 bg-purple-100 text-purple-700 text-xs sm:text-sm font-medium rounded-full self-start sm:self-auto">
              {expiringClients.length} clients
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-sm font-medium text-slate-500">
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Package</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringClients.length > 0 ? (
                  expiringClients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-semibold text-slate-600">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">
                            {client.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {client.phone}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-sm rounded-md font-medium">
                          {client.package}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(client.expiryDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge daysLeft={client.daysLeft} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hello ${client.name}, your internet package "${client.package}" will expire on ${new Date(
                                client.expiryDate,
                              ).toLocaleDateString()}. Please renew to avoid service interruption.`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-full shadow-sm hover:shadow-md transition-all"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-sm hover:shadow-md transition-all"
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
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <UserCheck className="w-12 h-12 opacity-50" />
                        <p className="font-medium">No expiring clients</p>
                        <p className="text-sm">
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
          <div className="md:hidden divide-y divide-slate-100">
            {expiringClients.length > 0 ? (
              expiringClients.map((client) => (
                <div key={client.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-semibold text-slate-600 flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{client.name}</p>
                      <p className="text-sm text-slate-600">{client.phone}</p>
                    </div>
                    <StatusBadge daysLeft={client.daysLeft} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                      {client.package}
                    </span>
                    <span className="text-slate-600">
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
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-sm transition-all"
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
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-sm transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <UserCheck className="w-12 h-12 opacity-50" />
                  <p className="font-medium">No expiring clients</p>
                  <p className="text-sm">
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
    default: "from-slate-800 to-slate-600",
    warning: "from-amber-600 to-orange-500",
    success: "from-emerald-600 to-teal-500",
  };
  return (
    <section className={`space-y-3 sm:space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <div
          className={`p-2 rounded-lg bg-linear-to-br ${variants[variant]} shadow-lg`}
        >
          <div className="text-white">{icon}</div>
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800">{title}</h2>
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
  color: "blue" | "emerald" | "rose" | "amber" | "purple" | "orange"; // ✅ Added "orange"
  onClick?: () => void;
}) {
  const colors = {
    blue: {
      bg: "from-blue-50 to-blue-100/50",
      icon: "bg-blue-500",
      border: "border-blue-200",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100/50",
      icon: "bg-emerald-500",
      border: "border-emerald-200",
    },
    rose: {
      bg: "from-rose-50 to-rose-100/50",
      icon: "bg-rose-500",
      border: "border-rose-200",
    },
    amber: {
      bg: "from-amber-50 to-amber-100/50",
      icon: "bg-amber-500",
      border: "border-amber-200",
    },
    purple: {
      bg: "from-purple-50 to-purple-100/50",
      icon: "bg-purple-500",
      border: "border-purple-200",
    },
    orange: {  // ✅ Added orange color option
      bg: "from-orange-50 to-orange-100/50",
      icon: "bg-orange-500",
      border: "border-orange-200",
    },
  };
  const c = colors[color];
  return (
    <div
      className={`relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <div
        className={`absolute -top-10 -right-10 w-24 h-24 sm:w-32 sm:h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
      />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-linear-to-br ${c.icon} shadow-lg text-white`}
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
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    due: {
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-200",
    },
    upcoming: {
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
  };
  const t = types[type];
  return (
    <div
      className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl ${t.bg} ${t.color}`}>{icon}</div>
        <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${t.color} opacity-60`} />
      </div>
      <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className="text-xl sm:text-2xl font-bold text-slate-800">
        Rs {amount.toLocaleString("en-PK")}
      </p>
      <div className={`mt-2 sm:mt-3 pt-2 sm:pt-3 border-t ${t.border}`}>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <div
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${type === "income" ? "bg-emerald-500" : type === "due" ? "bg-rose-500" : "bg-amber-500"}`}
          />
          <span className={t.color}>
            {type === "income"
              ? "Received"
              : type === "due"
                ? "Pending"
                : "Forecasted"}
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-600" />
        Recent Activity
      </h3>
      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 p-3 bg-slate-50 rounded-lg"
            >
              <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {activity.title}
                </p>
                <p className="text-xs text-slate-500">{activity.description}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-center py-8">No recent activity</p>
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
  color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo";
  subtitle?: string;
  onClick?: () => void;
}) {
  const colors: Record<string, any> = {
    blue: {
      bg: "from-blue-50 to-blue-100/50",
      icon: "bg-blue-500",
      border: "border-blue-200",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100/50",
      icon: "bg-emerald-500",
      border: "border-emerald-200",
    },
    rose: {
      bg: "from-rose-50 to-rose-100/50",
      icon: "bg-rose-500",
      border: "border-rose-200",
    },
    amber: {
      bg: "from-amber-50 to-amber-100/50",
      icon: "bg-amber-500",
      border: "border-amber-200",
    },
    purple: {
      bg: "from-purple-50 to-purple-100/50",
      icon: "bg-purple-500",
      border: "border-purple-200",
    },
    indigo: {
      bg: "from-indigo-50 to-indigo-100/50",
      icon: "bg-indigo-500",
      border: "border-indigo-200",
    },
  };
  const c = colors[color];
  return (
    <div
      className={`relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <div
        className={`absolute -top-10 -right-10 w-24 h-24 sm:w-32 sm:h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
      />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            {value.toLocaleString()}
          </p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div
          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-linear-to-br ${c.icon} shadow-lg text-white`}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6">
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
      bg: "from-rose-500 to-pink-500",
      ring: "ring-rose-200",
      text: "text-rose-600",
      badge: "bg-rose-100 text-rose-700",
    },
    high: {
      bg: "from-amber-500 to-orange-500",
      ring: "ring-amber-200",
      text: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
    },
    medium: {
      bg: "from-blue-500 to-cyan-500",
      ring: "ring-blue-200",
      text: "text-blue-600",
      badge: "bg-blue-100 text-blue-700",
    },
  };
  const u = urgencies[urgency];
  return (
    <div
      className={`relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 overflow-hidden group ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${u.bg}`}
      />
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-lg ring-2 sm:ring-4 ${u.ring}`}>
          <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${u.text}`} />
        </div>
        {value > 0 && (
          <span
            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${u.badge}`}
          >
            {value} clients
          </span>
        )}
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 sm:mb-2">{value}</p>
      <p className="text-xs sm:text-sm text-slate-500">{message}</p>
      {value > 0 && (
        <div className="mt-3 sm:mt-4 h-1.5 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Expired
      </span>
    );
  if (daysLeft <= 1)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        {daysLeft} day left
      </span>
    );
  if (daysLeft <= 3)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {daysLeft} days left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {daysLeft} days left
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 animate-pulse">
      <header className="sticky top-0 z-40 bg-white/80 border-b border-slate-200/60 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 rounded" />
            <div className="h-4 w-72 bg-slate-100 rounded" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-40 bg-slate-100 rounded-full" />
            <div className="w-10 h-10 rounded-full bg-slate-200" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-slate-200 rounded-lg" />
              <div className="h-5 w-40 bg-slate-200 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="bg-white rounded-2xl p-5 border border-slate-200"
                >
                  <div className="flex justify-between">
                    <div className="space-y-3">
                      <div className="h-4 w-24 bg-slate-100 rounded" />
                      <div className="h-8 w-16 bg-slate-200 rounded" />
                      <div className="h-3 w-32 bg-slate-100 rounded" />
                    </div>
                    <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="h-5 w-48 bg-slate-200 rounded" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                  <div className="h-3 w-24 bg-slate-50 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}





// // app/dashboard/page.tsx
// "use client";

// import { useEffect, useState, useCallback, useRef } from "react";
// import { useRouter } from "next/navigation";
// import {
//   MessageCircle,
//   Mail,
//   Users,
//   UserCheck,
//   UserX,
//   DollarSign,
//   Calendar,
//   Clock,
//   AlertCircle,
//   TrendingUp,
//   RefreshCw,
//   ArrowUpRight,
//   ArrowDownRight,
//   Package,
//   AlertTriangle,
//   Shield,
//   User,
//   Plus,
//   CreditCard,
//   Receipt,
// } from "lucide-react";

// // ─────────────────────────────────────────────────────────────
// // Types (Match your API response structure)
// // ─────────────────────────────────────────────────────────────
// interface StatsData {
//   totalClients?: number;
//   activeClients?: number;
//   expiredClients?: number;
//   totalRevenue?: number;
//   totalUsers?: number;
//   activeUsers?: number;
//   expiredUsers?: number;
//   expireToday?: number;
//   expireNext3Days?: number;
//   expireNext7Days?: number;
//   paidToday?: number;
//   dueToday?: number;
//   dueNext7Days?: number;
//   totalExpenses?: number;
//   netProfit?: number;
//   todayRecovery?: number;
//   todayExpenses?: number;
//   newUsersToday?: number;
//   expiringToday?: number;
//   totalReceivable?: number;
//   totalPayable?: number;
//   netBalance?: number;
//   areaInsights?: Array<{
//     areaName: string;
//     totalClients: number;
//     activeClients: number;
//     expiredClients: number;
//   }>;
//   totalInventoryItems?: number;
//   lowStockItems?: number;
//   totalInventoryValue?: number;
//   totalEmployees?: number;
//   employeeRoles?: Array<{
//     role: string;
//     _count: { _all: number };
//   }>;
//   recentActivities?: Array<{
//     id: string;
//     type: "payment" | "client" | "complaint";
//     title: string;
//     description: string;
//     timestamp: string;
//     status?: string;
//   }>;
//   [key: string]: unknown;
// }

// interface ExpiringClient {
//   id: string;
//   name: string;
//   email: string;
//   phone: string;
//   package: string;
//   expiryDate: string;
//   daysLeft: number;
// }

// interface DashboardData {
//   stats: StatsData | null;
//   expiringClients: ExpiringClient[];
//   error: string | null;
//   isLoading: boolean;
// }

// // ─────────────────────────────────────────────────────────────
// // Main Component
// // ─────────────────────────────────────────────────────────────
// export default function DashboardPage() {
//   const router = useRouter();
//   const [data, setData] = useState<DashboardData>({
//     stats: null,
//     expiringClients: [],
//     error: null,
//     isLoading: true,
//   });
//   const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

//   // Refs for cleanup & preventing race conditions
//   const isMounted = useRef(true);
//   const hasRedirected = useRef(false);
//   const abortControllerRef = useRef<AbortController | null>(null);
//   const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

//   // ─────────────────────────────────────────────────────────
//   // Single Fetch Function (uses httpOnly cookies - NO localStorage)
//   // ─────────────────────────────────────────────────────────
//   const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
//     try {
//       const [overviewRes, expiringRes] = await Promise.all([
//         fetch("/api/dashboard/overview", {
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           cache: "no-store",
//           signal,
//         }),
//         fetch("/api/dashboard/expiring_clients", {
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           cache: "no-store",
//           signal,
//         }),
//       ]);

//       if (overviewRes.status === 401 || overviewRes.status === 403) {
//         throw new Error("AUTH_ERROR");
//       }
//       if (expiringRes.status === 401 || expiringRes.status === 403) {
//         throw new Error("AUTH_ERROR");
//       }

//       const overviewData = await overviewRes.json().catch(() => ({}));
//       const expiringData = await expiringRes.json().catch(() => []);

//       return {
//         stats: overviewData as StatsData,
//         expiringClients: Array.isArray(expiringData) ? expiringData : [],
//       };
//     } catch (error) {
//       if (error instanceof Error && error.name === "AbortError") {
//         throw error;
//       }
//       if (error instanceof Error && error.message === "AUTH_ERROR") {
//         throw error;
//       }
//       console.error("Dashboard fetch error:", error);
//       throw error;
//     }
//   }, []);

//   // ─────────────────────────────────────────────────────────
//   // Auth Failure Handler - Redirect ONCE
//   // ─────────────────────────────────────────────────────────
//   const handleAuthFailure = useCallback(() => {
//     if (hasRedirected.current) return;
//     hasRedirected.current = true;
//     router.replace("/login?redirect=/dashboard");
//   }, [router]);

//   // ─────────────────────────────────────────────────────────
//   // Load Data Function
//   // ─────────────────────────────────────────────────────────
//   const loadDashboardData = useCallback(async () => {
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//     }
//     abortControllerRef.current = new AbortController();
//     const { signal } = abortControllerRef.current;

//     try {
//       setData((prev) => ({ ...prev, isLoading: true, error: null }));

//       const result = await fetchDashboardData(signal);

//       if (!isMounted.current) return;

//       setData({
//         stats: result.stats,
//         expiringClients: result.expiringClients,
//         error: null,
//         isLoading: false,
//       });
//       setLastUpdated(new Date());
//     } catch (error) {
//       if (!isMounted.current) return;
//       if (error instanceof Error && error.name === "AbortError") return;

//       if (error instanceof Error && error.message === "AUTH_ERROR") {
//         handleAuthFailure();
//         return;
//       }

//       setData((prev) => ({
//         ...prev,
//         error: "Failed to load dashboard data",
//         isLoading: false,
//       }));
//     }
//   }, [fetchDashboardData, handleAuthFailure]);

//   // ─────────────────────────────────────────────────────────
//   // Initial Load + Auto-Refresh Setup
//   // ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     isMounted.current = true;
//     hasRedirected.current = false;

//     loadDashboardData();

//     refreshIntervalRef.current = setInterval(() => {
//       if (document.visibilityState === "visible" && !data.isLoading) {
//         loadDashboardData();
//       }
//     }, 30000);

//     return () => {
//       isMounted.current = false;
//       if (abortControllerRef.current) abortControllerRef.current.abort();
//       if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
//     };
//   }, [loadDashboardData]);

//   // ─────────────────────────────────────────────────────────
//   // Manual Refresh Handler
//   // ─────────────────────────────────────────────────────────
//   const handleRefresh = async () => {
//     if (data.isLoading) return;
//     await loadDashboardData();
//   };

//   // ─────────────────────────────────────────────────────────
//   // Loading State
//   // ─────────────────────────────────────────────────────────
//   if (data.isLoading && !data.stats) {
//     return <DashboardSkeleton />;
//   }

//   // ─────────────────────────────────────────────────────────
//   // Error State
//   // ─────────────────────────────────────────────────────────
//   if (data.error) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-slate-50">
//         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
//           <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
//           <h2 className="text-lg font-semibold text-slate-800 mb-2">
//             Error Loading Dashboard
//           </h2>
//           <p className="text-slate-500 mb-6">{data.error}</p>
//           <button
//             onClick={handleRefresh}
//             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────
//   // Render Dashboard UI
//   // ─────────────────────────────────────────────────────────
//   const stats = data.stats || {};
//   const expiringClients = data.expiringClients || [];

//   // Quick actions config for header buttons
//   const headerActions = [
//     {
//       label: "Add Client",
//       icon: <Plus className="w-4 h-4" />,
//       href: "/dashboard/clients/new",
//       color: "bg-blue-600 hover:bg-blue-700",
//     },
//     {
//       label: "Payment",
//       icon: <CreditCard className="w-4 h-4" />,
//       href: "/dashboard/payments/new",
//       color: "bg-emerald-600 hover:bg-emerald-700",
//     },
//     {
//       label: "Reports",
//       icon: <Receipt className="w-4 h-4" />,
//       href: "/dashboard/reports",
//       color: "bg-purple-600 hover:bg-purple-700",
//     },
//     {
//       label: "Packages",
//       icon: <Package className="w-4 h-4" />,
//       href: "/dashboard/packages",
//       color: "bg-orange-500 hover:bg-orange-600",
//     },
//   ];

//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
//       {/* Top Header Bar - UPDATED with Quick Action Buttons */}
//       <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto gap-4 sm:gap-0">
//           <div>
//             <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
//               Dashboard
//             </h1>
//             <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
//               Welcome back! Here's what's happening with your ISP today.
//             </p>
//           </div>

//           <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
//             {/* Quick Action Buttons - Moved from body to header */}
//             <div className="hidden lg:flex items-center gap-1.5 mr-2 sm:mr-4">
//               {headerActions.map((action) => (
//                 <button
//                   key={action.label}
//                   onClick={() => router.push(action.href)}
//                   className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all shadow-sm hover:shadow-md ${action.color}`}
//                   title={action.label}
//                 >
//                   {action.icon}
//                   <span className="hidden xl:inline">{action.label}</span>
//                 </button>
//               ))}
//             </div>

//             {/* Mobile: Dropdown for quick actions */}
//             <div className="lg:hidden">
//               <select
//                 onChange={(e) => {
//                   if (e.target.value) router.push(e.target.value);
//                   e.target.value = "";
//                 }}
//                 className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 defaultValue=""
//               >
//                 <option value="" disabled>
//                   Quick Actions
//                 </option>
//                 {headerActions.map((action) => (
//                   <option key={action.label} value={action.href}>
//                     {action.label}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
//               <Clock className="w-4 h-4" />
//               <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={handleRefresh}
//                 className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
//                 title="Refresh data"
//                 disabled={data.isLoading}
//               >
//                 <RefreshCw
//                   className={`w-4 sm:w-5 h-4 sm:h-5 text-slate-600 group-hover:text-blue-600 transition-colors ${
//                     data.isLoading ? "animate-spin" : ""
//                   }`}
//                 />
//               </button>
//               <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/25">
//                 A
//               </div>
//             </div>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
//         {/* ✅ Quick Actions section REMOVED from here */}
//         {/* REAL-TIME STATS */}
//                 {/* ✅ TWO-COLUMN LAYOUT: User Overview + Real-Time Stats */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
//           {/* User Overview Section */}
//           <Section title="User Overview" icon={<Users className="w-5 h-5" />}>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//               <StatCard
//                 title="Total Users"
//                 value={stats.totalUsers ?? stats.totalClients ?? 0}
//                 icon={<Users className="w-6 h-6" />}
//                 color="blue"
//                 onClick={() => router.push("/dashboard/clients")}
//               />
//               <StatCard
//                 title="Active Users"
//                 value={stats.activeUsers ?? stats.activeClients ?? 0}
//                 icon={<UserCheck className="w-6 h-6" />}
//                 color="emerald"
//                 onClick={() => router.push("/dashboard/clients?status=active")}
//               />
//               <StatCard
//                 title="Expired Users"
//                 value={stats.expiredUsers ?? stats.expiredClients ?? 0}
//                 icon={<UserX className="w-6 h-6" />}
//                 color="rose"
//                 onClick={() => router.push("/dashboard/clients?status=expired")}
//               />
//             </div>
//           </Section>

//           {/* Real-Time Stats Section */}
//           <Section
//             title="Real-Time Stats"
//             icon={<TrendingUp className="w-5 h-5" />}
//             variant="success"
//           >
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
//               <FinCard
//                 title="Today's Recovery"
//                 amount={stats.todayRecovery ?? stats.paidToday ?? 0}
//                 type="income"
//                 icon={<ArrowUpRight className="w-5 h-5" />}
//                 onClick={() => router.push("/dashboard/payments")}
//               />
//               <FinCard
//                 title="Today's Expenses"
//                 amount={stats.todayExpenses ?? 0}
//                 type="due"
//                 icon={<Clock className="w-5 h-5" />}
//                 onClick={() => router.push("/dashboard/expenses")}
//               />
//               <StatCard
//                 title="New Users Today"
//                 value={stats.newUsersToday ?? 0}
//                 icon={<Users className="w-6 h-6" />}
//                 color="purple"
//                 onClick={() => router.push("/dashboard/clients")}
//               />
//               <StatCard
//                 title="Expiring Today"
//                 value={stats.expireToday ?? stats.expiringToday ?? 0}
//                 icon={<AlertCircle className="w-6 h-6" />}
//                 color="rose"
//                 onClick={() => router.push("/dashboard/clients?expiring=today")}
//               />
//             </div>
//           </Section>
//         </div>

//         {/* FINANCIAL METRICS - Full width */}
//         <Section
//           title="Financial Summary"
//           icon={<DollarSign className="w-5 h-5" />}
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <FinCard
//               title="Total Revenue"
//               amount={stats.totalRevenue ?? 0}
//               type="income"
//               icon={<ArrowUpRight className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//             <FinCard
//               title="Total Expenses"
//               amount={stats.totalExpenses ?? 0}
//               type="due"
//               icon={<Clock className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/expenses")}
//             />
//             <FinCard
//               title="Net Profit"
//               amount={stats.netProfit ?? 0}
//               type={(stats.netProfit ?? 0) >= 0 ? "income" : "due"}
//               icon={<TrendingUp className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//           </div>
//         </Section>

//         {/* ACCOUNTS SUMMARY */}
//         <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
//           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//             <DollarSign className="w-5 h-5 text-emerald-600" />
//             Accounts Summary
//           </h3>
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <AccountItem
//               label="Total Receivable"
//               value={stats.totalReceivable ?? 0}
//               type="receivable"
//             />
//             <AccountItem
//               label="Total Payable"
//               value={stats.totalPayable ?? 0}
//               type="payable"
//             />
//             <AccountItem
//               label="Net Balance"
//               value={stats.netBalance ?? 0}
//               type="net"
//             />
//           </div>
//         </section>

//         {/* CHARTS SECTION */}
//         <div className="grid grid-cols-1 gap-4 sm:gap-6">
//           <ChartPlaceholder title="Revenue vs Expenses (Monthly)" />
//           <ChartPlaceholder title="New Users Growth" />
//         </div>

//         {/* AREA INSIGHTS & ACTIVITY */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
//           <AreaInsightsPlaceholder areaInsights={stats.areaInsights ?? []} />
//           <ActivityFeedPlaceholder activities={stats.recentActivities ?? []} />
//         </div>

//         {/* INVENTORY OVERVIEW */}
//         <Section
//           title="Inventory Overview"
//           icon={<Package className="w-5 h-5" />}
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <InventoryCard
//               title="Total Items"
//               value={stats.totalInventoryItems ?? 0}
//               icon={<Package className="w-6 h-6" />}
//               color="blue"
//               onClick={() => router.push("/dashboard/inventory")}
//             />
//             <InventoryCard
//               title="Low Stock Items"
//               value={stats.lowStockItems ?? 0}
//               icon={<AlertTriangle className="w-6 h-6" />}
//               color="amber"
//               onClick={() => router.push("/dashboard/inventory")}
//             />
//             <InventoryCard
//               title="Total Value"
//               value={stats.totalInventoryValue ?? 0}
//               icon={<DollarSign className="w-6 h-6" />}
//               color="emerald"
//               subtitle="Rs"
//               onClick={() => router.push("/dashboard/inventory")}
//             />
//           </div>
//         </Section>

//         {/* EMPLOYEE OVERVIEW */}
//         <Section title="Employee Overview" icon={<Users className="w-5 h-5" />}>
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <EmployeeCard
//               title="Total Employees"
//               value={stats.totalEmployees ?? 0}
//               icon={<Users className="w-6 h-6" />}
//               color="purple"
//               onClick={() => router.push("/dashboard/employees")}
//             />
//             <EmployeeCard
//               title="Admins"
//               value={
//                 stats.employeeRoles?.find((r) => r.role === "ADMIN")?._count
//                   ._all ?? 0
//               }
//               icon={<Shield className="w-6 h-6" />}
//               color="indigo"
//               onClick={() => router.push("/dashboard/employees")}
//             />
//             <EmployeeCard
//               title="Staff"
//               value={
//                 stats.employeeRoles?.find((r) => r.role === "EMPLOYEE")?._count
//                   ._all ?? 0
//               }
//               icon={<User className="w-6 h-6" />}
//               color="blue"
//               onClick={() => router.push("/dashboard/employees")}
//             />
//           </div>
//         </Section>

//         {/* EXPIRATION ALERTS */}
//         <Section
//           title="Expiration Alerts"
//           icon={<AlertCircle className="w-5 h-5" />}
//           variant="warning"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <AlertCard
//               title="Expiring Today"
//               value={stats.expireToday ?? 0}
//               urgency="critical"
//               message={
//                 stats.expireToday
//                   ? "Immediate action required"
//                   : "All clear! 🎉"
//               }
//               onClick={() => router.push("/dashboard/clients?expiring=today")}
//             />
//             <AlertCard
//               title="Next 3 Days"
//               value={stats.expireNext3Days ?? 0}
//               urgency="high"
//               message="Plan renewals ahead"
//               onClick={() => router.push("/dashboard/clients?expiring=3days")}
//             />
//             <AlertCard
//               title="Next 7 Days"
//               value={stats.expireNext7Days ?? 0}
//               urgency="medium"
//               message="Prepare follow-ups"
//               onClick={() => router.push("/dashboard/clients?expiring=7days")}
//             />
//           </div>
//         </Section>

//         {/* REVENUE METRICS */}
//         <Section
//           title="Revenue Overview"
//           icon={<DollarSign className="w-5 h-5" />}
//           variant="success"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <FinCard
//               title="Paid Today"
//               amount={stats.paidToday ?? 0}
//               type="income"
//               icon={<ArrowUpRight className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//             <FinCard
//               title="Due Today"
//               amount={stats.dueToday ?? 0}
//               type="due"
//               icon={<Clock className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//             <FinCard
//               title="Due Next 7 Days"
//               amount={stats.dueNext7Days ?? 0}
//               type="upcoming"
//               icon={<Calendar className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//           </div>
//         </Section>

//         {/* EXPIRING CLIENTS TABLE */}
//         <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
//           <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-purple-50/50 to-transparent">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-purple-100 rounded-lg">
//                 <Calendar className="w-5 h-5 text-purple-600" />
//               </div>
//               <div>
//                 <h2 className="font-semibold text-slate-800">
//                   Clients Expiring Soon
//                 </h2>
//                 <p className="text-sm text-slate-500">
//                   Proactive retention opportunities
//                 </p>
//               </div>
//             </div>
//             <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
//               {expiringClients.length} clients
//             </span>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-slate-50/80">
//                 <tr className="text-left text-sm font-medium text-slate-500">
//                   <th className="px-6 py-4">Client</th>
//                   <th className="px-6 py-4">Contact</th>
//                   <th className="px-6 py-4">Package</th>
//                   <th className="px-6 py-4">Expiry Date</th>
//                   <th className="px-6 py-4">Status</th>
//                   <th className="px-6 py-4">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {expiringClients.length > 0 ? (
//                   expiringClients.map((client, index) => (
//                     <tr
//                       key={client.id}
//                       className="hover:bg-slate-50/80 transition-colors group"
//                     >
//                       <td className="px-6 py-4">
//                         <div className="flex items-center gap-3">
//                           <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-semibold text-slate-600">
//                             {client.name.charAt(0).toUpperCase()}
//                           </div>
//                           <span className="font-medium text-slate-800">
//                             {client.name}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 text-slate-600">
//                         {client.phone}
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-sm rounded-md font-medium">
//                           {client.package}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 text-slate-600">
//                         {new Date(client.expiryDate).toLocaleDateString(
//                           "en-US",
//                           {
//                             month: "short",
//                             day: "numeric",
//                             year: "numeric",
//                           },
//                         )}
//                       </td>
//                       <td className="px-6 py-4">
//                         <StatusBadge daysLeft={client.daysLeft} />
//                       </td>
//                       <td className="px-6 py-4">
//                         <div className="flex gap-2">
//                           <a
//                             href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
//                               `Hello ${client.name}, your internet package "${client.package}" will expire on ${new Date(
//                                 client.expiryDate,
//                               ).toLocaleDateString()}. Please renew to avoid service interruption.`,
//                             )}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-full shadow-sm hover:shadow-md transition-all"
//                           >
//                             <MessageCircle className="w-3.5 h-3.5" />
//                             WhatsApp
//                           </a>
//                           <a
//                             href={`mailto:${client.email}?subject=${encodeURIComponent(
//                               "Internet Package Expiry Reminder",
//                             )}&body=${encodeURIComponent(
//                               `Hello ${client.name},\n\nYour internet package "${client.package}" will expire on ${new Date(
//                                 client.expiryDate,
//                               ).toLocaleDateString()}.\n\nPlease renew your package to avoid service interruption.\n\nThank you.`,
//                             )}`}
//                             className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-sm hover:shadow-md transition-all"
//                           >
//                             <Mail className="w-3.5 h-3.5" />
//                             Email
//                           </a>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={6} className="px-6 py-12 text-center">
//                       <div className="flex flex-col items-center gap-3 text-slate-400">
//                         <UserCheck className="w-12 h-12 opacity-50" />
//                         <p className="font-medium">No expiring clients</p>
//                         <p className="text-sm">
//                           All your clients are up to date! 🎉
//                         </p>
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────
// // Helper Components (Self-contained fallbacks)
// // ─────────────────────────────────────────────────────────────

// function Section({
//   title,
//   icon,
//   children,
//   variant = "default",
// }: {
//   title: string;
//   icon: React.ReactNode;
//   children: React.ReactNode;
//   variant?: "default" | "warning" | "success";
// }) {
//   const variants = {
//     default: "from-slate-800 to-slate-600",
//     warning: "from-amber-600 to-orange-500",
//     success: "from-emerald-600 to-teal-500",
//   };
//   return (
//     <section className="space-y-4">
//       <div className="flex items-center gap-2">
//         <div
//           className={`p-2 rounded-lg bg-linear-to-br ${variants[variant]} shadow-lg`}
//         >
//           <div className="text-white">{icon}</div>
//         </div>
//         <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
//       </div>
//       {children}
//     </section>
//   );
// }

// function StatCard({
//   title,
//   value,
//   icon,
//   color,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple";
//   onClick?: () => void;
// }) {
//   const colors = {
//     blue: {
//       bg: "from-blue-50 to-blue-100/50",
//       icon: "bg-blue-500",
//       border: "border-blue-200",
//     },
//     emerald: {
//       bg: "from-emerald-50 to-emerald-100/50",
//       icon: "bg-emerald-500",
//       border: "border-emerald-200",
//     },
//     rose: {
//       bg: "from-rose-50 to-rose-100/50",
//       icon: "bg-rose-500",
//       border: "border-rose-200",
//     },
//     amber: {
//       bg: "from-amber-50 to-amber-100/50",
//       icon: "bg-amber-500",
//       border: "border-amber-200",
//     },
//     purple: {
//       bg: "from-purple-50 to-purple-100/50",
//       icon: "bg-purple-500",
//       border: "border-purple-200",
//     },
//   };
//   const c = colors[color];
//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
//       onClick={onClick}
//     >
//       <div
//         className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
//       />
//       <div className="relative flex items-start justify-between">
//         <div className="space-y-1">
//           <p className="text-sm font-medium text-slate-500">{title}</p>
//           <p className="text-3xl font-bold text-slate-800 tracking-tight">
//             {value.toLocaleString()}
//           </p>
//         </div>
//         <div
//           className={`p-3 rounded-xl bg-linear-to-br ${c.icon} shadow-lg text-white`}
//         >
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }

// function FinCard({
//   title,
//   amount,
//   type,
//   icon,
//   onClick,
// }: {
//   title: string;
//   amount: number;
//   type: "income" | "due" | "upcoming";
//   icon: React.ReactNode;
//   onClick?: () => void;
// }) {
//   const types = {
//     income: {
//       color: "text-emerald-600",
//       bg: "bg-emerald-50",
//       border: "border-emerald-200",
//     },
//     due: {
//       color: "text-rose-600",
//       bg: "bg-rose-50",
//       border: "border-rose-200",
//     },
//     upcoming: {
//       color: "text-amber-600",
//       bg: "bg-amber-50",
//       border: "border-amber-200",
//     },
//   };
//   const t = types[type];
//   return (
//     <div
//       className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
//       onClick={onClick}
//     >
//       <div className="flex items-center justify-between mb-4">
//         <div className={`p-2.5 rounded-xl ${t.bg} ${t.color}`}>{icon}</div>
//         <TrendingUp className={`w-5 h-5 ${t.color} opacity-60`} />
//       </div>
//       <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
//       <p className="text-2xl font-bold text-slate-800">
//         Rs {amount.toLocaleString("en-PK")}
//       </p>
//       <div className={`mt-3 pt-3 border-t ${t.border}`}>
//         <div className="flex items-center gap-2 text-sm">
//           <div
//             className={`w-2 h-2 rounded-full ${type === "income" ? "bg-emerald-500" : type === "due" ? "bg-rose-500" : "bg-amber-500"}`}
//           />
//           <span className={t.color}>
//             {type === "income"
//               ? "Received"
//               : type === "due"
//                 ? "Pending"
//                 : "Forecasted"}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// function AccountItem({
//   label,
//   value,
//   type,
// }: {
//   label: string;
//   value: number;
//   type: "receivable" | "payable" | "net";
// }) {
//   const styles = {
//     receivable: { color: "text-emerald-600", bg: "bg-emerald-50" },
//     payable: { color: "text-rose-600", bg: "bg-rose-50" },
//     net: { color: "text-blue-600", bg: "bg-blue-50" },
//   };
//   const s = styles[type];
//   return (
//     <div className={`p-4 rounded-xl ${s.bg} border border-slate-200/60`}>
//       <p className="text-sm text-slate-500">{label}</p>
//       <p className={`text-xl font-bold ${s.color}`}>
//         Rs {Math.abs(value).toLocaleString("en-PK")}
//       </p>
//     </div>
//   );
// }

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

// function ActivityFeedPlaceholder({
//   activities,
// }: {
//   activities: Array<{
//     id: string;
//     type: string;
//     title: string;
//     description: string;
//     timestamp: string;
//   }>;
// }) {
//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
//       <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//         <Clock className="w-5 h-5 text-purple-600" />
//         Recent Activity
//       </h3>
//       {activities.length > 0 ? (
//         <div className="space-y-3">
//           {activities.slice(0, 5).map((activity) => (
//             <div
//               key={activity.id}
//               className="flex gap-3 p-3 bg-slate-50 rounded-lg"
//             >
//               <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
//               <div>
//                 <p className="text-sm font-medium text-slate-700">
//                   {activity.title}
//                 </p>
//                 <p className="text-xs text-slate-500">{activity.description}</p>
//                 <p className="text-xs text-slate-400 mt-1">
//                   {new Date(activity.timestamp).toLocaleString()}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className="text-slate-400 text-center py-8">No recent activity</p>
//       )}
//     </div>
//   );
// }

// function InventoryCard({
//   title,
//   value,
//   icon,
//   color,
//   subtitle,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo";
//   subtitle?: string;
//   onClick?: () => void;
// }) {
//   const colors: Record<string, any> = {
//     blue: {
//       bg: "from-blue-50 to-blue-100/50",
//       icon: "bg-blue-500",
//       border: "border-blue-200",
//     },
//     emerald: {
//       bg: "from-emerald-50 to-emerald-100/50",
//       icon: "bg-emerald-500",
//       border: "border-emerald-200",
//     },
//     rose: {
//       bg: "from-rose-50 to-rose-100/50",
//       icon: "bg-rose-500",
//       border: "border-rose-200",
//     },
//     amber: {
//       bg: "from-amber-50 to-amber-100/50",
//       icon: "bg-amber-500",
//       border: "border-amber-200",
//     },
//     purple: {
//       bg: "from-purple-50 to-purple-100/50",
//       icon: "bg-purple-500",
//       border: "border-purple-200",
//     },
//     indigo: {
//       bg: "from-indigo-50 to-indigo-100/50",
//       icon: "bg-indigo-500",
//       border: "border-indigo-200",
//     },
//   };
//   const c = colors[color];
//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
//       onClick={onClick}
//     >
//       <div
//         className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
//       />
//       <div className="relative flex items-start justify-between">
//         <div className="space-y-1">
//           <p className="text-sm font-medium text-slate-500">{title}</p>
//           <p className="text-3xl font-bold text-slate-800 tracking-tight">
//             {value.toLocaleString()}
//           </p>
//           {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
//         </div>
//         <div
//           className={`p-3 rounded-xl bg-linear-to-br ${c.icon} shadow-lg text-white`}
//         >
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }

// function EmployeeCard({
//   title,
//   value,
//   icon,
//   color,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo";
//   onClick?: () => void;
// }) {
//   return (
//     <InventoryCard
//       title={title}
//       value={value}
//       icon={icon}
//       color={color}
//       onClick={onClick}
//     />
//   );
// }

// function AlertCard({
//   title,
//   value,
//   urgency,
//   message,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   urgency: "critical" | "high" | "medium";
//   message: string;
//   onClick?: () => void;
// }) {
//   const urgencies = {
//     critical: {
//       bg: "from-rose-500 to-pink-500",
//       ring: "ring-rose-200",
//       text: "text-rose-600",
//       badge: "bg-rose-100 text-rose-700",
//     },
//     high: {
//       bg: "from-amber-500 to-orange-500",
//       ring: "ring-amber-200",
//       text: "text-amber-600",
//       badge: "bg-amber-100 text-amber-700",
//     },
//     medium: {
//       bg: "from-blue-500 to-cyan-500",
//       ring: "ring-blue-200",
//       text: "text-blue-600",
//       badge: "bg-blue-100 text-blue-700",
//     },
//   };
//   const u = urgencies[urgency];
//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 overflow-hidden group ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
//       onClick={onClick}
//     >
//       <div
//         className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${u.bg}`}
//       />
//       <div className="flex items-start justify-between mb-3">
//         <div className={`p-2 rounded-lg ring-4 ${u.ring}`}>
//           <AlertCircle className={`w-5 h-5 ${u.text}`} />
//         </div>
//         {value > 0 && (
//           <span
//             className={`px-2.5 py-1 text-xs font-semibold rounded-full ${u.badge}`}
//           >
//             {value} clients
//           </span>
//         )}
//       </div>
//       <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
//       <p className="text-3xl font-bold text-slate-800 mb-2">{value}</p>
//       <p className="text-sm text-slate-500">{message}</p>
//       {value > 0 && (
//         <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
//           <div
//             className={`h-full bg-linear-to-r ${u.bg} transition-all duration-500`}
//             style={{ width: `${Math.min(value * 15, 100)}%` }}
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// function StatusBadge({ daysLeft }: { daysLeft: number }) {
//   if (daysLeft <= 0)
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
//         Expired
//       </span>
//     );
//   if (daysLeft <= 1)
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
//         {daysLeft} day left
//       </span>
//     );
//   if (daysLeft <= 3)
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
//         {daysLeft} days left
//       </span>
//     );
//   return (
//     <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
//       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
//       {daysLeft} days left
//     </span>
//   );
// }

// function DashboardSkeleton() {
//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 animate-pulse">
//       <header className="sticky top-0 z-40 bg-white/80 border-b border-slate-200/60 px-8 py-4">
//         <div className="max-w-7xl mx-auto flex items-center justify-between">
//           <div className="space-y-2">
//             <div className="h-7 w-48 bg-slate-200 rounded" />
//             <div className="h-4 w-72 bg-slate-100 rounded" />
//           </div>
//           <div className="flex items-center gap-4">
//             <div className="h-8 w-40 bg-slate-100 rounded-full" />
//             <div className="w-10 h-10 rounded-full bg-slate-200" />
//           </div>
//         </div>
//       </header>
//       <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
//         {[1, 2, 3].map((section) => (
//           <div key={section} className="space-y-4">
//             <div className="flex items-center gap-2">
//               <div className="w-9 h-9 bg-slate-200 rounded-lg" />
//               <div className="h-5 w-40 bg-slate-200 rounded" />
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//               {[1, 2, 3].map((card) => (
//                 <div
//                   key={card}
//                   className="bg-white rounded-2xl p-5 border border-slate-200"
//                 >
//                   <div className="flex justify-between">
//                     <div className="space-y-3">
//                       <div className="h-4 w-24 bg-slate-100 rounded" />
//                       <div className="h-8 w-16 bg-slate-200 rounded" />
//                       <div className="h-3 w-32 bg-slate-100 rounded" />
//                     </div>
//                     <div className="w-12 h-12 bg-slate-100 rounded-xl" />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}
//         <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//           <div className="px-6 py-5 border-b border-slate-100">
//             <div className="h-5 w-48 bg-slate-200 rounded" />
//           </div>
//           <div className="p-6 space-y-4">
//             {[1, 2, 3, 4].map((row) => (
//               <div key={row} className="flex items-center gap-4">
//                 <div className="w-9 h-9 rounded-full bg-slate-100" />
//                 <div className="flex-1 space-y-2">
//                   <div className="h-4 w-32 bg-slate-100 rounded" />
//                   <div className="h-3 w-24 bg-slate-50 rounded" />
//                 </div>
//                 <div className="h-6 w-20 bg-slate-100 rounded-full" />
//               </div>
//             ))}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }







// // app/dashboard/page.tsx
// "use client";

// import { useEffect, useState, useCallback, useRef } from "react";
// import { useRouter } from "next/navigation";
// import {
//   MessageCircle,
//   Mail,
//   Users,
//   UserCheck,
//   UserX,
//   DollarSign,
//   Calendar,
//   Clock,
//   AlertCircle,
//   TrendingUp,
//   RefreshCw,
//   ArrowUpRight,
//   ArrowDownRight,
//   Package,
//   AlertTriangle,
//   Shield,
//   User,
//   Plus,
//   CreditCard,
//   Receipt,
// } from "lucide-react";

// // ─────────────────────────────────────────────────────────────
// // Types (Match your API response structure)
// // ─────────────────────────────────────────────────────────────
// interface StatsData {
//   totalClients?: number;
//   activeClients?: number;
//   expiredClients?: number;
//   totalRevenue?: number;
//   totalUsers?: number;
//   activeUsers?: number;
//   expiredUsers?: number;
//   expireToday?: number;
//   expireNext3Days?: number;
//   expireNext7Days?: number;
//   paidToday?: number;
//   dueToday?: number;
//   dueNext7Days?: number;
//   totalExpenses?: number;
//   netProfit?: number;
//   todayRecovery?: number;
//   todayExpenses?: number;
//   newUsersToday?: number;
//   expiringToday?: number;
//   totalReceivable?: number;
//   totalPayable?: number;
//   netBalance?: number;
//   areaInsights?: Array<{
//     areaName: string;
//     totalClients: number;
//     activeClients: number;
//     expiredClients: number;
//   }>;
//   totalInventoryItems?: number;
//   lowStockItems?: number;
//   totalInventoryValue?: number;
//   totalEmployees?: number;
//   employeeRoles?: Array<{
//     role: string;
//     _count: { _all: number };
//   }>;
//   recentActivities?: Array<{
//     id: string;
//     type: "payment" | "client" | "complaint";
//     title: string;
//     description: string;
//     timestamp: string;
//     status?: string;
//   }>;
//   [key: string]: unknown;
// }

// interface ExpiringClient {
//   id: string;
//   name: string;
//   email: string;
//   phone: string;
//   package: string;
//   expiryDate: string;
//   daysLeft: number;
// }

// interface DashboardData {
//   stats: StatsData | null;
//   expiringClients: ExpiringClient[];
//   error: string | null;
//   isLoading: boolean;
// }

// // ─────────────────────────────────────────────────────────────
// // Main Component
// // ─────────────────────────────────────────────────────────────
// export default function DashboardPage() {
//   const router = useRouter();
//   const [data, setData] = useState<DashboardData>({
//     stats: null,
//     expiringClients: [],
//     error: null,
//     isLoading: true,
//   });
//   const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

//   // Refs for cleanup & preventing race conditions
//   const isMounted = useRef(true);
//   const hasRedirected = useRef(false);
//   const abortControllerRef = useRef<AbortController | null>(null);
//   const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

//   // ─────────────────────────────────────────────────────────
//   // Single Fetch Function (uses httpOnly cookies - NO localStorage)
//   // ─────────────────────────────────────────────────────────
//   const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
//     try {
//       // ✅ Using httpOnly cookies: credentials: 'include' sends them automatically
//       // No need to manually add Authorization header
//       const [overviewRes, expiringRes] = await Promise.all([
//         fetch("/api/dashboard/overview", {
//           headers: { "Content-Type": "application/json" },
//           credentials: "include", // ✅ Critical for httpOnly cookies
//           cache: "no-store",
//           signal,
//         }),
//         fetch("/api/dashboard/expiring_clients", {
//           headers: { "Content-Type": "application/json" },
//           credentials: "include",
//           cache: "no-store",
//           signal,
//         }),
//       ]);

//       // Handle auth errors (401/403)
//       if (overviewRes.status === 401 || overviewRes.status === 403) {
//         throw new Error("AUTH_ERROR");
//       }
//       if (expiringRes.status === 401 || expiringRes.status === 403) {
//         throw new Error("AUTH_ERROR");
//       }

//       // Parse responses
//       const overviewData = await overviewRes.json().catch(() => ({}));
//       const expiringData = await expiringRes.json().catch(() => []);

//       return {
//         stats: overviewData as StatsData,
//         expiringClients: Array.isArray(expiringData) ? expiringData : [],
//       };
//     } catch (error) {
//       if (error instanceof Error && error.name === "AbortError") {
//         throw error; // Re-throw abort errors for cleanup
//       }
//       if (error instanceof Error && error.message === "AUTH_ERROR") {
//         throw error; // Re-throw auth errors for redirect
//       }
//       console.error("Dashboard fetch error:", error);
//       throw error;
//     }
//   }, []);

//   // ─────────────────────────────────────────────────────────
//   // Auth Failure Handler - Redirect ONCE
//   // ─────────────────────────────────────────────────────────
//   const handleAuthFailure = useCallback(() => {
//     if (hasRedirected.current) return;
//     hasRedirected.current = true;
//     router.replace("/login?redirect=/dashboard");
//   }, [router]);

//   // ─────────────────────────────────────────────────────────
//   // Load Data Function
//   // ─────────────────────────────────────────────────────────
//   const loadDashboardData = useCallback(async () => {
//     // Cancel any pending requests
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//     }
//     abortControllerRef.current = new AbortController();
//     const { signal } = abortControllerRef.current;

//     try {
//       setData((prev) => ({ ...prev, isLoading: true, error: null }));

//       const result = await fetchDashboardData(signal);

//       if (!isMounted.current) return;

//       setData({
//         stats: result.stats,
//         expiringClients: result.expiringClients,
//         error: null,
//         isLoading: false,
//       });
//       setLastUpdated(new Date());
//     } catch (error) {
//       if (!isMounted.current) return;
//       if (error instanceof Error && error.name === "AbortError") return;

//       if (error instanceof Error && error.message === "AUTH_ERROR") {
//         handleAuthFailure();
//         return;
//       }

//       setData((prev) => ({
//         ...prev,
//         error: "Failed to load dashboard data",
//         isLoading: false,
//       }));
//     }
//   }, [fetchDashboardData, handleAuthFailure]);

//   // ─────────────────────────────────────────────────────────
//   // Initial Load + Auto-Refresh Setup
//   // ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     isMounted.current = true;
//     hasRedirected.current = false;

//     // Initial load
//     loadDashboardData();

//     // Auto-refresh every 30 seconds (not 15 - reduces server load)
//     refreshIntervalRef.current = setInterval(() => {
//       if (document.visibilityState === "visible" && !data.isLoading) {
//         loadDashboardData();
//       }
//     }, 30000);

//     // Cleanup on unmount
//     return () => {
//       isMounted.current = false;
//       if (abortControllerRef.current) abortControllerRef.current.abort();
//       if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
//     };
//   }, [loadDashboardData]); // Removed data.isLoading from dependency array to prevent continuous re-renders

//   // ─────────────────────────────────────────────────────────
//   // Manual Refresh Handler
//   // ─────────────────────────────────────────────────────────
//   const handleRefresh = async () => {
//     if (data.isLoading) return;
//     await loadDashboardData();
//   };

//   // ─────────────────────────────────────────────────────────
//   // Loading State
//   // ─────────────────────────────────────────────────────────
//   if (data.isLoading && !data.stats) {
//     return <DashboardSkeleton />;
//   }

//   // ─────────────────────────────────────────────────────────
//   // Error State
//   // ─────────────────────────────────────────────────────────
//   if (data.error) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-slate-50">
//         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
//           <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
//           <h2 className="text-lg font-semibold text-slate-800 mb-2">
//             Error Loading Dashboard
//           </h2>
//           <p className="text-slate-500 mb-6">{data.error}</p>
//           <button
//             onClick={handleRefresh}
//             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────
//   // Render Dashboard UI
//   // ─────────────────────────────────────────────────────────
//   const stats = data.stats || {};
//   const expiringClients = data.expiringClients || [];

//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
//       {/* Top Header Bar */}
//       <header className="sticky top-0 z-40 backdrop-blur-xl bg-red-400 border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto gap-4 sm:gap-0">
//           <div>
//             <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
//               Dashboard
//             </h1>
//             <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
//               Welcome back! Here's what's happening with your ISP today.
//             </p>
//           </div>

//           <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
//             <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
//               <Clock className="w-4 h-4" />
//               <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={handleRefresh}
//                 className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
//                 title="Refresh data"
//                 disabled={data.isLoading}
//               >
//                 <RefreshCw
//                   className={`w-4 sm:w-5 h-4 sm:h-5 text-slate-600 group-hover:text-blue-600 transition-colors ${
//                     data.isLoading ? "animate-spin" : ""
//                   }`}
//                 />
//               </button>
//               <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/25">
//                 A
//               </div>
//             </div>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
//         {/* QUICK ACTIONS - Fallback if component missing */}
//         <section className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/60 p-5 sm:p-6 overflow-hidden">
//           {/* subtle background gradient */}
//           <div className="absolute inset-0 bg-linear-to-br from-blue-50/30 via-transparent to-indigo-50/20 pointer-events-none" />

//           <h3 className="relative font-semibold text-slate-800 mb-5 flex items-center gap-2 text-lg">
//             <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
//               <TrendingUp className="w-5 h-5" />
//             </div>
//             Quick Actions
//           </h3>

//           <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4">
//             {[
//               {
//                 label: "Add Client",
//                 icon: <Plus className="w-5 h-5" />,
//                 href: "/dashboard/clients/new",
//                 color: "from-blue-300 to-indigo-300",
//                 bg: "bg-blue-50",
//                 text: "text-blue-600",
//               },
//               {
//                 label: "Record Payment",
//                 icon: <CreditCard className="w-5 h-5" />,
//                 href: "/dashboard/payments/new",
//                 color: "from-emerald-300 to-green-300",
//                 bg: "bg-emerald-50",
//                 text: "text-emerald-600",
//               },
//               {
//                 label: "View Reports",
//                 icon: <Receipt className="w-5 h-5" />,
//                 href: "/dashboard/reports",
//                 color: "from-purple-300 to-indigo-300",
//                 bg: "bg-purple-50",
//                 text: "text-purple-600",
//               },
//               {
//                 label: "Manage Packages",
//                 icon: <Package className="w-5 h-5" />,
//                 href: "/dashboard/packages",
//                 color: "from-orange-300 to-amber-300",
//                 bg: "bg-orange-50",
//                 text: "text-orange-600",
//               },
//             ].map((action) => (
//               <button
//                 key={action.label}
//                 onClick={() => router.push(action.href)}
//                 className="group relative flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
//               >
//                 {/* Subtle top gradient highlight (no blur) */}
//                 <div
//                   className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-linear-to-br ${action.color} opacity-[0.08] transition`}
//                 />

//                 {/* Icon */}
//                 <div
//                   className={`relative p-3 rounded-xl ${action.bg} ${action.text} shadow-sm group-hover:scale-105 transition`}
//                 >
//                   {action.icon}
//                 </div>

//                 {/* Label */}
//                 <span className="relative text-sm font-medium text-slate-700 group-hover:text-slate-900 transition">
//                   {action.label}
//                 </span>

//                 {/* Clean bottom line (thin & controlled) */}
//                 <div
//                   className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-linear-to-r ${action.color} group-hover:w-2/3 transition-all duration-300`}
//                 />
//               </button>
//             ))}
//           </div>
//         </section>
//         {/* <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
//           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//             <TrendingUp className="w-5 h-5 text-blue-600" />
//             Quick Actions
//           </h3>
//           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//             {[
//               { label: "Add Client", icon: <Plus className="w-4 h-4" />, href: "/dashboard/clients/new" },
//               { label: "Record Payment", icon: <CreditCard className="w-4 h-4" />, href: "/dashboard/payments/new" },
//               { label: "View Reports", icon: <Receipt className="w-4 h-4" />, href: "/dashboard/reports" },
//               { label: "Manage Packages", icon: <Package className="w-4 h-4" />, href: "/dashboard/packages" },
//             ].map((action) => (
//               <button
//                 key={action.label}
//                 onClick={() => router.push(action.href)}
//                 className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition group"
//               >
//                 <div className="p-2 rounded-lg bg-white shadow-sm group-hover:shadow-md transition">
//                   {action.icon}
//                 </div>
//                 <span className="text-xs font-medium text-slate-600 group-hover:text-blue-700">
//                   {action.label}
//                 </span>
//               </button>
//             ))}
//           </div>
//         </section> */}

//         {/* TOP STATS - User Overview */}
//         <Section title="User Overview" icon={<Users className="w-5 h-5" />}>
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <StatCard
//               title="Total Users"
//               value={stats.totalUsers ?? stats.totalClients ?? 0}
//               icon={<Users className="w-6 h-6" />}
//               color="blue"
//               onClick={() => router.push("/dashboard/clients")}
//             />
//             <StatCard
//               title="Active Users"
//               value={stats.activeUsers ?? stats.activeClients ?? 0}
//               icon={<UserCheck className="w-6 h-6" />}
//               color="emerald"
//               onClick={() => router.push("/dashboard/clients?status=active")}
//             />
//             <StatCard
//               title="Expired Users"
//               value={stats.expiredUsers ?? stats.expiredClients ?? 0}
//               icon={<UserX className="w-6 h-6" />}
//               color="rose"
//               onClick={() => router.push("/dashboard/clients?status=expired")}
//             />
//           </div>
//         </Section>

//         {/* REAL-TIME STATS */}
//         <Section
//           title="Real-Time Stats"
//           icon={<TrendingUp className="w-5 h-5" />}
//           variant="success"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
//             <FinCard
//               title="Today's Recovery"
//               amount={stats.todayRecovery ?? stats.paidToday ?? 0}
//               type="income"
//               icon={<ArrowUpRight className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//             <FinCard
//               title="Today's Expenses"
//               amount={stats.todayExpenses ?? 0}
//               type="due"
//               icon={<Clock className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/expenses")}
//             />
//             <StatCard
//               title="New Users Today"
//               value={stats.newUsersToday ?? 0}
//               icon={<Users className="w-6 h-6" />}
//               color="purple"
//               onClick={() => router.push("/dashboard/clients")}
//             />
//             <StatCard
//               title="Expiring Today"
//               value={stats.expireToday ?? stats.expiringToday ?? 0}
//               icon={<AlertCircle className="w-6 h-6" />}
//               color="rose"
//               onClick={() => router.push("/dashboard/clients?expiring=today")}
//             />
//           </div>
//         </Section>

//         {/* FINANCIAL METRICS */}
//         <Section
//           title="Financial Summary"
//           icon={<DollarSign className="w-5 h-5" />}
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <FinCard
//               title="Total Revenue"
//               amount={stats.totalRevenue ?? 0}
//               type="income"
//               icon={<ArrowUpRight className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//             <FinCard
//               title="Total Expenses"
//               amount={stats.totalExpenses ?? 0}
//               type="due"
//               icon={<Clock className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/expenses")}
//             />
//             <FinCard
//               title="Net Profit"
//               amount={stats.netProfit ?? 0}
//               type={(stats.netProfit ?? 0) >= 0 ? "income" : "due"}
//               icon={<TrendingUp className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//           </div>
//         </Section>

//         {/* ACCOUNTS SUMMARY - Fallback */}
//         <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
//           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//             <DollarSign className="w-5 h-5 text-emerald-600" />
//             Accounts Summary
//           </h3>
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <AccountItem
//               label="Total Receivable"
//               value={stats.totalReceivable ?? 0}
//               type="receivable"
//             />
//             <AccountItem
//               label="Total Payable"
//               value={stats.totalPayable ?? 0}
//               type="payable"
//             />
//             <AccountItem
//               label="Net Balance"
//               value={stats.netBalance ?? 0}
//               type="net"
//             />
//           </div>
//         </section>

//         {/* CHARTS SECTION - Fallback with placeholder */}
//         <div className="grid grid-cols-1 gap-4 sm:gap-6">
//           <ChartPlaceholder title="Revenue vs Expenses (Monthly)" />
//           <ChartPlaceholder title="New Users Growth" />
//         </div>

//         {/* AREA INSIGHTS & ACTIVITY - Fallback */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
//           <AreaInsightsPlaceholder areaInsights={stats.areaInsights ?? []} />
//           <ActivityFeedPlaceholder activities={stats.recentActivities ?? []} />
//         </div>

//         {/* INVENTORY OVERVIEW */}
//         <Section
//           title="Inventory Overview"
//           icon={<Package className="w-5 h-5" />}
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <InventoryCard
//               title="Total Items"
//               value={stats.totalInventoryItems ?? 0}
//               icon={<Package className="w-6 h-6" />}
//               color="blue"
//               onClick={() => router.push("/dashboard/inventory")}
//             />
//             <InventoryCard
//               title="Low Stock Items"
//               value={stats.lowStockItems ?? 0}
//               icon={<AlertTriangle className="w-6 h-6" />}
//               color="amber"
//               onClick={() => router.push("/dashboard/inventory")}
//             />
//             <InventoryCard
//               title="Total Value"
//               value={stats.totalInventoryValue ?? 0}
//               icon={<DollarSign className="w-6 h-6" />}
//               color="emerald"
//               subtitle="Rs"
//               onClick={() => router.push("/dashboard/inventory")}
//             />
//           </div>
//         </Section>

//         {/* EMPLOYEE OVERVIEW */}
//         <Section title="Employee Overview" icon={<Users className="w-5 h-5" />}>
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <EmployeeCard
//               title="Total Employees"
//               value={stats.totalEmployees ?? 0}
//               icon={<Users className="w-6 h-6" />}
//               color="purple"
//               onClick={() => router.push("/dashboard/employees")}
//             />
//             <EmployeeCard
//               title="Admins"
//               value={
//                 stats.employeeRoles?.find((r) => r.role === "ADMIN")?._count
//                   ._all ?? 0
//               }
//               icon={<Shield className="w-6 h-6" />}
//               color="indigo"
//               onClick={() => router.push("/dashboard/employees")}
//             />
//             <EmployeeCard
//               title="Staff"
//               value={
//                 stats.employeeRoles?.find((r) => r.role === "EMPLOYEE")?._count
//                   ._all ?? 0
//               }
//               icon={<User className="w-6 h-6" />}
//               color="blue"
//               onClick={() => router.push("/dashboard/employees")}
//             />
//           </div>
//         </Section>

//         {/* EXPIRATION ALERTS */}
//         <Section
//           title="Expiration Alerts"
//           icon={<AlertCircle className="w-5 h-5" />}
//           variant="warning"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <AlertCard
//               title="Expiring Today"
//               value={stats.expireToday ?? 0}
//               urgency="critical"
//               message={
//                 stats.expireToday
//                   ? "Immediate action required"
//                   : "All clear! 🎉"
//               }
//               onClick={() => router.push("/dashboard/clients?expiring=today")}
//             />
//             <AlertCard
//               title="Next 3 Days"
//               value={stats.expireNext3Days ?? 0}
//               urgency="high"
//               message="Plan renewals ahead"
//               onClick={() => router.push("/dashboard/clients?expiring=3days")}
//             />
//             <AlertCard
//               title="Next 7 Days"
//               value={stats.expireNext7Days ?? 0}
//               urgency="medium"
//               message="Prepare follow-ups"
//               onClick={() => router.push("/dashboard/clients?expiring=7days")}
//             />
//           </div>
//         </Section>

//         {/* REVENUE METRICS */}
//         <Section
//           title="Revenue Overview"
//           icon={<DollarSign className="w-5 h-5" />}
//           variant="success"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <FinCard
//               title="Paid Today"
//               amount={stats.paidToday ?? 0}
//               type="income"
//               icon={<ArrowUpRight className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//             <FinCard
//               title="Due Today"
//               amount={stats.dueToday ?? 0}
//               type="due"
//               icon={<Clock className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//             <FinCard
//               title="Due Next 7 Days"
//               amount={stats.dueNext7Days ?? 0}
//               type="upcoming"
//               icon={<Calendar className="w-5 h-5" />}
//               onClick={() => router.push("/dashboard/payments")}
//             />
//           </div>
//         </Section>

//         {/* EXPIRING CLIENTS TABLE */}
//         <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
//           <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-purple-50/50 to-transparent">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-purple-100 rounded-lg">
//                 <Calendar className="w-5 h-5 text-purple-600" />
//               </div>
//               <div>
//                 <h2 className="font-semibold text-slate-800">
//                   Clients Expiring Soon
//                 </h2>
//                 <p className="text-sm text-slate-500">
//                   Proactive retention opportunities
//                 </p>
//               </div>
//             </div>
//             <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
//               {expiringClients.length} clients
//             </span>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-slate-50/80">
//                 <tr className="text-left text-sm font-medium text-slate-500">
//                   <th className="px-6 py-4">Client</th>
//                   <th className="px-6 py-4">Contact</th>
//                   <th className="px-6 py-4">Package</th>
//                   <th className="px-6 py-4">Expiry Date</th>
//                   <th className="px-6 py-4">Status</th>
//                   <th className="px-6 py-4">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {expiringClients.length > 0 ? (
//                   expiringClients.map((client, index) => (
//                     <tr
//                       key={client.id}
//                       className="hover:bg-slate-50/80 transition-colors group"
//                     >
//                       <td className="px-6 py-4">
//                         <div className="flex items-center gap-3">
//                           <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-semibold text-slate-600">
//                             {client.name.charAt(0).toUpperCase()}
//                           </div>
//                           <span className="font-medium text-slate-800">
//                             {client.name}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 text-slate-600">
//                         {client.phone}
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-sm rounded-md font-medium">
//                           {client.package}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 text-slate-600">
//                         {new Date(client.expiryDate).toLocaleDateString(
//                           "en-US",
//                           {
//                             month: "short",
//                             day: "numeric",
//                             year: "numeric",
//                           },
//                         )}
//                       </td>
//                       <td className="px-6 py-4">
//                         <StatusBadge daysLeft={client.daysLeft} />
//                       </td>
//                       <td className="px-6 py-4">
//                         <div className="flex gap-2">
//                           {/* WhatsApp */}
//                           <a
//                             href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
//                               `Hello ${client.name}, your internet package "${client.package}" will expire on ${new Date(
//                                 client.expiryDate,
//                               ).toLocaleDateString()}. Please renew to avoid service interruption.`,
//                             )}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-full shadow-sm hover:shadow-md transition-all"
//                           >
//                             <MessageCircle className="w-3.5 h-3.5" />
//                             WhatsApp
//                           </a>
//                           {/* Email */}
//                           <a
//                             href={`mailto:${client.email}?subject=${encodeURIComponent(
//                               "Internet Package Expiry Reminder",
//                             )}&body=${encodeURIComponent(
//                               `Hello ${client.name},\n\nYour internet package "${client.package}" will expire on ${new Date(
//                                 client.expiryDate,
//                               ).toLocaleDateString()}.\n\nPlease renew your package to avoid service interruption.\n\nThank you.`,
//                             )}`}
//                             className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-sm hover:shadow-md transition-all"
//                           >
//                             <Mail className="w-3.5 h-3.5" />
//                             Email
//                           </a>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={6} className="px-6 py-12 text-center">
//                       <div className="flex flex-col items-center gap-3 text-slate-400">
//                         <UserCheck className="w-12 h-12 opacity-50" />
//                         <p className="font-medium">No expiring clients</p>
//                         <p className="text-sm">
//                           All your clients are up to date! 🎉
//                         </p>
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────
// // Helper Components (Self-contained fallbacks)
// // ─────────────────────────────────────────────────────────────

// function Section({
//   title,
//   icon,
//   children,
//   variant = "default",
// }: {
//   title: string;
//   icon: React.ReactNode;
//   children: React.ReactNode;
//   variant?: "default" | "warning" | "success";
// }) {
//   const variants = {
//     default: "from-slate-800 to-slate-600",
//     warning: "from-amber-600 to-orange-500",
//     success: "from-emerald-600 to-teal-500",
//   };
//   return (
//     <section className="space-y-4">
//       <div className="flex items-center gap-2">
//         <div
//           className={`p-2 rounded-lg bg-linear-to-br ${variants[variant]} shadow-lg`}
//         >
//           <div className="text-white">{icon}</div>
//         </div>
//         <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
//       </div>
//       {children}
//     </section>
//   );
// }

// function StatCard({
//   title,
//   value,
//   icon,
//   color,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple";
//   onClick?: () => void;
// }) {
//   const colors = {
//     blue: {
//       bg: "from-blue-50 to-blue-100/50",
//       icon: "bg-blue-500",
//       border: "border-blue-200",
//     },
//     emerald: {
//       bg: "from-emerald-50 to-emerald-100/50",
//       icon: "bg-emerald-500",
//       border: "border-emerald-200",
//     },
//     rose: {
//       bg: "from-rose-50 to-rose-100/50",
//       icon: "bg-rose-500",
//       border: "border-rose-200",
//     },
//     amber: {
//       bg: "from-amber-50 to-amber-100/50",
//       icon: "bg-amber-500",
//       border: "border-amber-200",
//     },
//     purple: {
//       bg: "from-purple-50 to-purple-100/50",
//       icon: "bg-purple-500",
//       border: "border-purple-200",
//     },
//   };
//   const c = colors[color];
//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
//       onClick={onClick}
//     >
//       <div
//         className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
//       />
//       <div className="relative flex items-start justify-between">
//         <div className="space-y-1">
//           <p className="text-sm font-medium text-slate-500">{title}</p>
//           <p className="text-3xl font-bold text-slate-800 tracking-tight">
//             {value.toLocaleString()}
//           </p>
//         </div>
//         <div
//           className={`p-3 rounded-xl bg-linear-to-br ${c.icon} shadow-lg text-white`}
//         >
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }

// function FinCard({
//   title,
//   amount,
//   type,
//   icon,
//   onClick,
// }: {
//   title: string;
//   amount: number;
//   type: "income" | "due" | "upcoming";
//   icon: React.ReactNode;
//   onClick?: () => void;
// }) {
//   const types = {
//     income: {
//       color: "text-emerald-600",
//       bg: "bg-emerald-50",
//       border: "border-emerald-200",
//     },
//     due: {
//       color: "text-rose-600",
//       bg: "bg-rose-50",
//       border: "border-rose-200",
//     },
//     upcoming: {
//       color: "text-amber-600",
//       bg: "bg-amber-50",
//       border: "border-amber-200",
//     },
//   };
//   const t = types[type];
//   return (
//     <div
//       className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
//       onClick={onClick}
//     >
//       <div className="flex items-center justify-between mb-4">
//         <div className={`p-2.5 rounded-xl ${t.bg} ${t.color}`}>{icon}</div>
//         <TrendingUp className={`w-5 h-5 ${t.color} opacity-60`} />
//       </div>
//       <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
//       <p className="text-2xl font-bold text-slate-800">
//         Rs {amount.toLocaleString("en-PK")}
//       </p>
//       <div className={`mt-3 pt-3 border-t ${t.border}`}>
//         <div className="flex items-center gap-2 text-sm">
//           <div
//             className={`w-2 h-2 rounded-full ${type === "income" ? "bg-emerald-500" : type === "due" ? "bg-rose-500" : "bg-amber-500"}`}
//           />
//           <span className={t.color}>
//             {type === "income"
//               ? "Received"
//               : type === "due"
//                 ? "Pending"
//                 : "Forecasted"}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// function AccountItem({
//   label,
//   value,
//   type,
// }: {
//   label: string;
//   value: number;
//   type: "receivable" | "payable" | "net";
// }) {
//   const styles = {
//     receivable: { color: "text-emerald-600", bg: "bg-emerald-50" },
//     payable: { color: "text-rose-600", bg: "bg-rose-50" },
//     net: { color: "text-blue-600", bg: "bg-blue-50" },
//   };
//   const s = styles[type];
//   return (
//     <div className={`p-4 rounded-xl ${s.bg} border border-slate-200/60`}>
//       <p className="text-sm text-slate-500">{label}</p>
//       <p className={`text-xl font-bold ${s.color}`}>
//         Rs {Math.abs(value).toLocaleString("en-PK")}
//       </p>
//     </div>
//   );
// }

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

// function ActivityFeedPlaceholder({
//   activities,
// }: {
//   activities: Array<{
//     id: string;
//     type: string;
//     title: string;
//     description: string;
//     timestamp: string;
//   }>;
// }) {
//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6">
//       <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
//         <Clock className="w-5 h-5 text-purple-600" />
//         Recent Activity
//       </h3>
//       {activities.length > 0 ? (
//         <div className="space-y-3">
//           {activities.slice(0, 5).map((activity) => (
//             <div
//               key={activity.id}
//               className="flex gap-3 p-3 bg-slate-50 rounded-lg"
//             >
//               <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
//               <div>
//                 <p className="text-sm font-medium text-slate-700">
//                   {activity.title}
//                 </p>
//                 <p className="text-xs text-slate-500">{activity.description}</p>
//                 <p className="text-xs text-slate-400 mt-1">
//                   {new Date(activity.timestamp).toLocaleString()}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className="text-slate-400 text-center py-8">No recent activity</p>
//       )}
//     </div>
//   );
// }

// function InventoryCard({
//   title,
//   value,
//   icon,
//   color,
//   subtitle,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo";
//   subtitle?: string;
//   onClick?: () => void;
// }) {
//   const colors: Record<string, any> = {
//     blue: {
//       bg: "from-blue-50 to-blue-100/50",
//       icon: "bg-blue-500",
//       border: "border-blue-200",
//     },
//     emerald: {
//       bg: "from-emerald-50 to-emerald-100/50",
//       icon: "bg-emerald-500",
//       border: "border-emerald-200",
//     },
//     rose: {
//       bg: "from-rose-50 to-rose-100/50",
//       icon: "bg-rose-500",
//       border: "border-rose-200",
//     },
//     amber: {
//       bg: "from-amber-50 to-amber-100/50",
//       icon: "bg-amber-500",
//       border: "border-amber-200",
//     },
//     purple: {
//       bg: "from-purple-50 to-purple-100/50",
//       icon: "bg-purple-500",
//       border: "border-purple-200",
//     },
//     indigo: {
//       bg: "from-indigo-50 to-indigo-100/50",
//       icon: "bg-indigo-500",
//       border: "border-indigo-200",
//     },
//   };
//   const c = colors[color];
//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
//       onClick={onClick}
//     >
//       <div
//         className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
//       />
//       <div className="relative flex items-start justify-between">
//         <div className="space-y-1">
//           <p className="text-sm font-medium text-slate-500">{title}</p>
//           <p className="text-3xl font-bold text-slate-800 tracking-tight">
//             {value.toLocaleString()}
//           </p>
//           {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
//         </div>
//         <div
//           className={`p-3 rounded-xl bg-linear-to-br ${c.icon} shadow-lg text-white`}
//         >
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }

// function EmployeeCard({
//   title,
//   value,
//   icon,
//   color,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo";
//   onClick?: () => void;
// }) {
//   return (
//     <InventoryCard
//       title={title}
//       value={value}
//       icon={icon}
//       color={color}
//       onClick={onClick}
//     />
//   );
// }

// function AlertCard({
//   title,
//   value,
//   urgency,
//   message,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   urgency: "critical" | "high" | "medium";
//   message: string;
//   onClick?: () => void;
// }) {
//   const urgencies = {
//     critical: {
//       bg: "from-rose-500 to-pink-500",
//       ring: "ring-rose-200",
//       text: "text-rose-600",
//       badge: "bg-rose-100 text-rose-700",
//     },
//     high: {
//       bg: "from-amber-500 to-orange-500",
//       ring: "ring-amber-200",
//       text: "text-amber-600",
//       badge: "bg-amber-100 text-amber-700",
//     },
//     medium: {
//       bg: "from-blue-500 to-cyan-500",
//       ring: "ring-blue-200",
//       text: "text-blue-600",
//       badge: "bg-blue-100 text-blue-700",
//     },
//   };
//   const u = urgencies[urgency];
//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 overflow-hidden group ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
//       onClick={onClick}
//     >
//       <div
//         className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${u.bg}`}
//       />
//       <div className="flex items-start justify-between mb-3">
//         <div className={`p-2 rounded-lg ring-4 ${u.ring}`}>
//           <AlertCircle className={`w-5 h-5 ${u.text}`} />
//         </div>
//         {value > 0 && (
//           <span
//             className={`px-2.5 py-1 text-xs font-semibold rounded-full ${u.badge}`}
//           >
//             {value} clients
//           </span>
//         )}
//       </div>
//       <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
//       <p className="text-3xl font-bold text-slate-800 mb-2">{value}</p>
//       <p className="text-sm text-slate-500">{message}</p>
//       {value > 0 && (
//         <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
//           <div
//             className={`h-full bg-linear-to-r ${u.bg} transition-all duration-500`}
//             style={{ width: `${Math.min(value * 15, 100)}%` }}
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// function StatusBadge({ daysLeft }: { daysLeft: number }) {
//   if (daysLeft <= 0)
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
//         Expired
//       </span>
//     );
//   if (daysLeft <= 1)
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
//         {daysLeft} day left
//       </span>
//     );
//   if (daysLeft <= 3)
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
//         {daysLeft} days left
//       </span>
//     );
//   return (
//     <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
//       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
//       {daysLeft} days left
//     </span>
//   );
// }

// function DashboardSkeleton() {
//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 animate-pulse">
//       <header className="sticky top-0 z-40 bg-white/80 border-b border-slate-200/60 px-8 py-4">
//         <div className="max-w-7xl mx-auto flex items-center justify-between">
//           <div className="space-y-2">
//             <div className="h-7 w-48 bg-slate-200 rounded" />
//             <div className="h-4 w-72 bg-slate-100 rounded" />
//           </div>
//           <div className="flex items-center gap-4">
//             <div className="h-8 w-40 bg-slate-100 rounded-full" />
//             <div className="w-10 h-10 rounded-full bg-slate-200" />
//           </div>
//         </div>
//       </header>
//       <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
//         {[1, 2, 3].map((section) => (
//           <div key={section} className="space-y-4">
//             <div className="flex items-center gap-2">
//               <div className="w-9 h-9 bg-slate-200 rounded-lg" />
//               <div className="h-5 w-40 bg-slate-200 rounded" />
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//               {[1, 2, 3].map((card) => (
//                 <div
//                   key={card}
//                   className="bg-white rounded-2xl p-5 border border-slate-200"
//                 >
//                   <div className="flex justify-between">
//                     <div className="space-y-3">
//                       <div className="h-4 w-24 bg-slate-100 rounded" />
//                       <div className="h-8 w-16 bg-slate-200 rounded" />
//                       <div className="h-3 w-32 bg-slate-100 rounded" />
//                     </div>
//                     <div className="w-12 h-12 bg-slate-100 rounded-xl" />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}
//         <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//           <div className="px-6 py-5 border-b border-slate-100">
//             <div className="h-5 w-48 bg-slate-200 rounded" />
//           </div>
//           <div className="p-6 space-y-4">
//             {[1, 2, 3, 4].map((row) => (
//               <div key={row} className="flex items-center gap-4">
//                 <div className="w-9 h-9 rounded-full bg-slate-100" />
//                 <div className="flex-1 space-y-2">
//                   <div className="h-4 w-32 bg-slate-100 rounded" />
//                   <div className="h-3 w-24 bg-slate-50 rounded" />
//                 </div>
//                 <div className="h-6 w-20 bg-slate-100 rounded-full" />
//               </div>
//             ))}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// // app/dashboard/page.tsx
// 'use client';

// import { useRouter, useSearchParams } from 'next/navigation';
// import { useEffect, useState, useCallback, useRef } from 'react';

// // ─────────────────────────────────────────────────────────────
// // Types (match your API responses)
// // ─────────────────────────────────────────────────────────────
// interface Activity {
//   id: string;
//   type: 'payment' | 'client' | 'complaint';
//   title: string;
//   description: string;
//   timestamp: string;
//   status?: string;
// }

// interface DashboardOverview {
//   totalClients?: number;
//   totalRevenue?: number;
//   activeSubscriptions?: number;
//   pendingComplaints?: number;
//   recentActivities: Activity[];
//   [key: string]: unknown;
// }

// interface ExpiringClient {
//   id: string;
//   name: string;
//   email: string;
//   package?: {
//     name: string;
//     endDate: string;
//   };
//   expiryDate: string;
// }

// interface DashboardData {
//   overview: DashboardOverview | null;
//   expiringClients: ExpiringClient[];
//   error: string | null;
//   isLoading: boolean;
// }

// // ─────────────────────────────────────────────────────────────
// // Main Component
// // ─────────────────────────────────────────────────────────────
// export default function DashboardPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const redirectParam = searchParams.get('redirect');

//   const [data, setData] = useState<DashboardData>({
//     overview: null,
//     expiringClients: [],
//     error: null,
//     isLoading: true,
//   });

//   // Refs to prevent race conditions & infinite loops
//   const isMounted = useRef(true);
//   const hasRedirected = useRef(false);
//   const abortControllerRef = useRef<AbortController | null>(null);

//   // ─────────────────────────────────────────────────────────
//   // Fetch Functions (using httpOnly cookies)
//   // ─────────────────────────────────────────────────────────
//   const fetchOverview = useCallback(async (signal: AbortSignal) => {
//     const response = await fetch('/api/dashboard/overview', {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       credentials: 'include', // ✅ Critical: sends httpOnly cookies
//       signal,
//       cache: 'no-store', // Prevent stale cached 401 responses
//     });

//     if (response.status === 401 || response.status === 403) {
//       throw new Error('AUTH_ERROR');
//     }

//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}));
//       throw new Error(errorData.error || `HTTP ${response.status}`);
//     }

//     return response.json();
//   }, []);

//   const fetchExpiringClients = useCallback(async (signal: AbortSignal) => {
//     const response = await fetch('/api/dashboard/expiring_clients', {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       credentials: 'include', // ✅ Critical: sends httpOnly cookies
//       signal,
//       cache: 'no-store',
//     });

//     if (response.status === 401 || response.status === 403) {
//       throw new Error('AUTH_ERROR');
//     }

//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}));
//       throw new Error(errorData.error || `HTTP ${response.status}`);
//     }

//     return response.json();
//   }, []);

//   // ─────────────────────────────────────────────────────────
//   // Auth Failure Handler - Redirect ONCE
//   // ─────────────────────────────────────────────────────────
//   const handleAuthFailure = useCallback(() => {
//     // Prevent multiple redirects
//     if (hasRedirected.current) return;
//     hasRedirected.current = true;

//     // Redirect to login with return URL
//     const returnUrl = redirectParam || '/dashboard';
//     router.replace(`/login?redirect=${encodeURIComponent(returnUrl)}`);
//   }, [router, redirectParam]);

//   // ─────────────────────────────────────────────────────────
//   // Main Data Loading Function
//   // ─────────────────────────────────────────────────────────
//   const loadDashboardData = useCallback(async () => {
//     // Cancel any pending requests before starting new ones
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort();
//     }
//     abortControllerRef.current = new AbortController();
//     const { signal } = abortControllerRef.current;

//     try {
//       setData(prev => ({ ...prev, isLoading: true, error: null }));

//       // Fetch both endpoints in parallel
//       const [overview, expiringClients] = await Promise.all([
//         fetchOverview(signal),
//         fetchExpiringClients(signal),
//       ]);

//       // Safety check: don't update state if unmounted
//       if (!isMounted.current) return;

//       setData({
//         overview,
//         expiringClients,
//         error: null,
//         isLoading: false,
//       });
//     } catch (error) {
//       // Safety check
//       if (!isMounted.current) return;

//       // Ignore abort errors (from cleanup/unmount)
//       if (error instanceof Error && error.name === 'AbortError') {
//         return;
//       }

//       // Handle auth errors - redirect to login
//       if (error instanceof Error && error.message === 'AUTH_ERROR') {
//         handleAuthFailure();
//         return;
//       }

//       // Handle other errors
//       console.error('Dashboard load error:', error);
//       setData(prev => ({
//         ...prev,
//         error: error instanceof Error ? error.message : 'Failed to load dashboard',
//         isLoading: false,
//       }));
//     }
//   }, [fetchOverview, fetchExpiringClients, handleAuthFailure]);

//   // ─────────────────────────────────────────────────────────
//   // Effect: Load data on mount + cleanup
//   // ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     isMounted.current = true;
//     hasRedirected.current = false;

//     loadDashboardData();

//     // Cleanup function: abort requests & prevent state updates on unmount
//     return () => {
//       isMounted.current = false;
//       if (abortControllerRef.current) {
//         abortControllerRef.current.abort();
//       }
//     };
//   }, [loadDashboardData]);

//   // ─────────────────────────────────────────────────────────
//   // Manual Refresh Handler
//   // ─────────────────────────────────────────────────────────
//   const handleRefresh = useCallback(() => {
//     if (!data.isLoading) {
//       loadDashboardData();
//     }
//   }, [data.isLoading, loadDashboardData]);

//   // ─────────────────────────────────────────────────────────
//   // Loading State
//   // ─────────────────────────────────────────────────────────
//   if (data.isLoading) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-gray-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
//           <p className="text-gray-600">Loading dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────
//   // Error State (non-auth errors)
//   // ─────────────────────────────────────────────────────────
//   if (data.error) {
//     return (
//       <div className="p-6 max-w-4xl mx-auto">
//         <div className="bg-red-50 border border-red-200 rounded-lg p-4">
//           <h2 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h2>
//           <p className="text-red-600 mb-4">{data.error}</p>
//           <button
//             onClick={handleRefresh}
//             className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────
//   // Empty State (shouldn't happen if authenticated)
//   // ─────────────────────────────────────────────────────────
//   if (!data.overview) {
//     return (
//       <div className="p-6 max-w-4xl mx-auto">
//         <div className="text-center py-12">
//           <p className="text-gray-500">No dashboard data available</p>
//           <button
//             onClick={handleRefresh}
//             className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
//           >
//             Refresh
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────
//   // ✅ Success: Render Dashboard UI
//   // ─────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow-sm border-b sticky top-0 z-10">
//         <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
//           <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
//           <button
//             onClick={handleRefresh}
//             disabled={data.isLoading}
//             className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition disabled:opacity-50 flex items-center gap-2"
//           >
//             <span>⟳</span>
//             {data.isLoading ? 'Refreshing...' : 'Refresh'}
//           </button>
//         </div>
//       </header>

//       <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
//         {/* Stats Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//           <StatCard
//             label="Total Clients"
//             value={data.overview.totalClients?.toLocaleString() || '0'}
//           />
//           <StatCard
//             label="Total Revenue"
//             value={`Rs ${data.overview.totalRevenue?.toLocaleString() || '0'}`}
//           />
//           <StatCard
//             label="Active Subscriptions"
//             value={data.overview.activeSubscriptions?.toLocaleString() || '0'}
//           />
//           <StatCard
//             label="Pending Complaints"
//             value={data.overview.pendingComplaints?.toLocaleString() || '0'}
//             highlight={!!(data.overview.pendingComplaints && data.overview.pendingComplaints > 0)}
//           />
//         </div>

//         {/* Recent Activities */}
//         <section className="bg-white rounded-lg shadow mb-8">
//           <div className="px-6 py-4 border-b flex justify-between items-center">
//             <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
//             <span className="text-sm text-gray-500">
//               Last {data.overview.recentActivities?.length || 0} items
//             </span>
//           </div>
//           <div className="divide-y">
//             {data.overview.recentActivities?.slice(0, 10).map((activity) => (
//               <ActivityItem key={activity.id} activity={activity} />
//             ))}
//             {(!data.overview.recentActivities || data.overview.recentActivities.length === 0) && (
//               <p className="px-6 py-8 text-gray-500 text-center">No recent activities</p>
//             )}
//           </div>
//         </section>

//         {/* Expiring Clients */}
//         {data.expiringClients && data.expiringClients.length > 0 && (
//           <section className="bg-white rounded-lg shadow">
//             <div className="px-6 py-4 border-b flex justify-between items-center">
//               <h2 className="text-lg font-semibold text-gray-900">
//                 Expiring Subscriptions
//               </h2>
//               <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
//                 {data.expiringClients.length} expiring soon
//               </span>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Client
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Package
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Expiry Date
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Action
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {data.expiringClients.map((client) => {
//                     const daysUntilExpiry = Math.ceil(
//                       (new Date(client.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
//                     );
//                     const isUrgent = daysUntilExpiry <= 3;

//                     return (
//                       <tr key={client.id} className="hover:bg-gray-50">
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <div className="text-sm font-medium text-gray-900">{client.name}</div>
//                           <div className="text-sm text-gray-500">{client.email}</div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className="px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
//                             {client.package?.name || 'Unknown'}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <div className={`text-sm font-medium ${
//                             isUrgent ? 'text-red-600' : 'text-gray-500'
//                           }`}>
//                             {new Date(client.expiryDate).toLocaleDateString()}
//                           </div>
//                           {isUrgent && (
//                             <span className="text-xs text-red-500">
//                               {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''} left
//                             </span>
//                           )}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm">
//                           <button
//                             className="text-blue-600 hover:text-blue-900 font-medium hover:underline"
//                             onClick={() => {
//                               // Handle renew action
//                               console.log('Renew client:', client.id);
//                             }}
//                           >
//                             Renew
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </section>
//         )}
//       </main>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────
// // Helper Components (keep in same file or extract to /components)
// // ─────────────────────────────────────────────────────────────

// function StatCard({
//   label,
//   value,
//   highlight = false
// }: {
//   label: string;
//   value: string;
//   highlight?: boolean;
// }) {
//   return (
//     <div className={`bg-white rounded-lg shadow p-6 border-l-4 transition hover:shadow-md ${
//       highlight ? 'border-l-red-500' : 'border-l-blue-500'
//     }`}>
//       <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
//       <dd className={`mt-1 text-2xl font-semibold ${
//         highlight ? 'text-red-600' : 'text-gray-900'
//       }`}>
//         {value}
//       </dd>
//     </div>
//   );
// }

// function ActivityItem({ activity }: { activity: Activity }) {
//   const getTypeIcon = (type: Activity['type']) => {
//     switch (type) {
//       case 'payment': return '💰';
//       case 'client': return '👤';
//       case 'complaint': return '⚠️';
//       default: return '📋';
//     }
//   };

//   const getTypeStyles = (type: Activity['type']) => {
//     switch (type) {
//       case 'payment': return { badge: 'bg-green-100 text-green-800', icon: 'bg-green-50' };
//       case 'client': return { badge: 'bg-blue-100 text-blue-800', icon: 'bg-blue-50' };
//       case 'complaint': return { badge: 'bg-red-100 text-red-800', icon: 'bg-red-50' };
//       default: return { badge: 'bg-gray-100 text-gray-800', icon: 'bg-gray-50' };
//     }
//   };

//   const styles = getTypeStyles(activity.type);

//   return (
//     <div className="px-6 py-4 hover:bg-gray-50 transition">
//       <div className="flex items-start space-x-3">
//         <span className={`shrink-0 w-8 h-8 ${styles.icon} rounded-full flex items-center justify-center text-lg`}>
//           {getTypeIcon(activity.type)}
//         </span>
//         <div className="flex-1 min-w-0">
//           <p className="text-sm font-medium text-gray-900">{activity.title}</p>
//           <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
//           <div className="mt-2 flex items-center flex-wrap gap-2">
//             <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles.badge}`}>
//               {activity.type}
//             </span>
//             {activity.status && (
//               <span className="text-xs text-gray-400">• {activity.status}</span>
//             )}
//             <time className="text-xs text-gray-400" dateTime={activity.timestamp}>
//               {new Date(activity.timestamp).toLocaleString()}
//             </time>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// ======================================
// Working original code
// ======================================
// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import FinCard from "@/components/FinCard";

// import {
//   MessageCircle,
//   Mail,
//   Users,
//   UserCheck,
//   UserX,
//   DollarSign,
//   Calendar,
//   Clock,
//   AlertCircle,
//   TrendingUp,
//   RefreshCw,
//   ArrowUpRight,
//   ArrowDownRight,
//   Plus,
//   CreditCard,
//   Receipt,
//   Package,
//   AlertTriangle,
//   Shield,
//   User
// } from "lucide-react";

// // Import new dashboard components
// import QuickActions from "@/components/dashboard/QuickActions";
// import AccountsSummary from "@/components/dashboard/AccountsSummary";
// import AreaInsights from "@/components/dashboard/AreaInsights";
// import ActivityFeed from "@/components/dashboard/ActivityFeed";
// import ChartCard from "@/components/dashboard/ChartCard";

// interface StatsData {
//   totalClients: number;
//   activeClients: number;
//   expiredClients: number;
//   totalRevenue: number;
//   totalUsers: number;
//   activeUsers: number;
//   expiredUsers: number;
//   expireToday: number;
//   expireNext3Days: number;
//   expireNext7Days: number;
//   paidToday: number;
//   dueToday: number;
//   dueNext7Days: number;
//   totalExpenses: number;
//   netProfit: number;
//   todayRecovery: number;
//   todayExpenses: number;
//   newUsersToday: number;
//   expiringToday: number;
//   totalReceivable: number;
//   totalPayable: number;
//   netBalance: number;
//   areaInsights: Array<{
//     areaName: string;
//     totalClients: number;
//     activeClients: number;
//     expiredClients: number;
//   }>;
//   totalInventoryItems: number;
//   lowStockItems: number;
//   totalInventoryValue: number;
//   totalEmployees: number;
//   employeeRoles: Array<{
//     role: string;
//     _count: {
//       _all: number;
//     };
//   }>;
// }

// interface ExpiringClient {
//   email: any;
//   id: string;
//   name: string;
//   phone: string;
//   package: string;
//   expiryDate: string;
//   daysLeft: number;
// }

// export default function DashboardPage() {
//   const [stats, setStats] = useState<StatsData | null>(null);
//   const [expiringClients, setExpiringClients] = useState<ExpiringClient[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
//   const router = useRouter();

//   // Function to fetch dashboard data
//   const fetchData = async (signal?: AbortSignal) => {
//     try {
//       const token = localStorage.getItem("token");

//       const getHeaders = (): HeadersInit => {
//         const headers: Record<string, string> = {
//           "Content-Type": "application/json",
//         };
//         if (token) headers["Authorization"] = `Bearer ${token}`;
//         return headers;
//       };

//       const [overviewRes, expiringRes] = await Promise.all([
//         fetch("/api/dashboard/overview", {
//           headers: getHeaders(),
//           credentials: "include",
//           cache: "no-store",
//           signal,
//         }),
//         fetch("/api/dashboard/expiring_clients", {
//           headers: getHeaders(),
//           credentials: "include",
//           cache: "no-store",
//           signal,
//         }),
//       ]);

//       if (overviewRes.status === 401 || expiringRes.status === 401) {
//         // Clear the expired token
//         localStorage.removeItem("token");
//         document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
//         router.push("/login");
//         return;
//       }

//       const overviewData = await overviewRes.json();
//       const expiringData = await expiringRes.json();

//       setStats(overviewData);
//       setExpiringClients(Array.isArray(expiringData) ? expiringData : []);
//       setLastUpdated(new Date());
//     } catch (error) {
//       if (error instanceof Error && error.name !== "AbortError") {
//         console.error("Dashboard fetch error:", error);
//       }
//     }
//   };

//   // Initial data fetch
//   useEffect(() => {
//     const abortController = new AbortController();

//     const initialFetch = async () => {
//       try {
//         await fetchData(abortController.signal);
//       } finally {
//         if (!abortController.signal.aborted) {
//           setLoading(false);
//         }
//       }
//     };

//     initialFetch();
//     return () => abortController.abort();
//   }, [router]);

//   // Auto-refresh for dashboard data every 15 seconds
//   useEffect(() => {
//     const dashboardRefreshInterval = setInterval(() => {
//       const fetchAllData = async () => {
//         try {
//           const token = localStorage.getItem("token");

//           const getHeaders = (): HeadersInit => {
//             const headers: Record<string, string> = {
//               "Content-Type": "application/json",
//             };
//             if (token) headers["Authorization"] = `Bearer ${token}`;
//             return headers;
//           };

//           // Fetch both stats and expiring clients
//           const [statsRes, expiringRes] = await Promise.all([
//             fetch("/api/dashboard/stats", {
//               headers: getHeaders(),
//               credentials: "include",
//               cache: "no-store",
//             }),
//             fetch("/api/dashboard/expiring_clients", {
//               headers: getHeaders(),
//               credentials: "include",
//               cache: "no-store",
//             }),
//           ]);

//           if (statsRes.status === 401 || expiringRes.status === 401) {
//             // Clear the expired token
//             localStorage.removeItem("token");
//             document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
//             router.push("/login");
//             return;
//           }

//           const statsData = await statsRes.json();
//           const expiringData = await expiringRes.json();

//           setStats(statsData);
//           setExpiringClients(Array.isArray(expiringData) ? expiringData : []);
//           setLastUpdated(new Date());
//         } catch (error) {
//           console.error("Dashboard refresh error:", error);
//         }
//       };

//       fetchAllData();
//     }, 15000); // Refresh every 15 seconds

//     return () => clearInterval(dashboardRefreshInterval);
//   }, [router]);

//   const handleRefresh = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");

//       const getHeaders = (): HeadersInit => {
//         const headers: Record<string, string> = {
//           "Content-Type": "application/json",
//         };
//         if (token) headers["Authorization"] = `Bearer ${token}`;
//         return headers;
//       };

//       const [overviewRes, expiringRes] = await Promise.all([
//         fetch("/api/dashboard/overview", {
//           headers: getHeaders(),
//           credentials: "include",
//           cache: "no-store",
//         }),
//         fetch("/api/dashboard/expiring_clients", {
//           headers: getHeaders(),
//           credentials: "include",
//           cache: "no-store",
//         }),
//       ]);

//       if (overviewRes.status === 401 || expiringRes.status === 401) {
//         // Clear the expired token
//         localStorage.removeItem("token");
//         document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
//         router.push("/login");
//         return;
//       }

//       const overviewData = await overviewRes.json();
//       const expiringData = await expiringRes.json();

//       setStats(overviewData);
//       setExpiringClients(Array.isArray(expiringData) ? expiringData : []);
//       setLastUpdated(new Date());
//     } catch (error) {
//       console.error("Manual refresh error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading && !stats) {
//     return <DashboardSkeleton />;
//   }

//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
//       {/* Top Header Bar */}
//       <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto gap-4 sm:gap-0">
//           <div>
//             <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
//               Dashboard
//             </h1>
//             <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
//               Welcome back! Here's what's happening with your ISP today.
//             </p>
//           </div>

//           <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
//             <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
//               <Clock className="w-4 h-4" />
//               <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={handleRefresh}
//                 className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
//                 title="Refresh data"
//               >
//                 <RefreshCw
//                   className={`w-4 sm:w-5 h-4 sm:h-5 text-slate-600 group-hover:text-blue-600 transition-colors ${loading ? "animate-spin" : ""}`}
//                 />
//               </button>
//               <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/25">
//                 A
//               </div>
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
//         {/* QUICK ACTIONS */}
//         <QuickActions />

//         {/* TOP STATS */}
//         <Section title="User Overview" icon={<Users className="w-5 h-5" />}>
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <StatCard
//               title="Total Users"
//               value={stats?.totalUsers ?? 0}
//               icon={<Users className="w-6 h-6" />}
//               color="blue"
//               trend={{ value: 12, positive: true }}
//               onClick={() => router.push('/dashboard/clients')}
//             />
//             <StatCard
//               title="Active Users"
//               value={stats?.activeUsers ?? 0}
//               icon={<UserCheck className="w-6 h-6" />}
//               color="emerald"
//               trend={{ value: 8, positive: true }}
//               onClick={() => router.push('/dashboard/clients?status=active')}
//             />
//             <StatCard
//               title="Expired Users"
//               value={stats?.expiredUsers ?? 0}
//               icon={<UserX className="w-6 h-6" />}
//               color="rose"
//               trend={{ value: 3, positive: false }}
//               onClick={() => router.push('/dashboard/clients?status=expired')}
//             />
//           </div>
//         </Section>

//         {/* REAL-TIME STATS */}
//         <Section
//           title="Real-Time Stats"
//           icon={<TrendingUp className="w-5 h-5" />}
//           variant="success"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
//             <FinCard
//               title="Today's Recovery"
//               amount={stats?.todayRecovery ?? 0}
//               type="income"
//               icon={<ArrowUpRight className="w-5 h-5" />}
//               onClick={() => router.push('/dashboard/payments')}
//             />
//             <FinCard
//               title="Today's Expenses"
//               amount={stats?.todayExpenses ?? 0}
//               type="due"
//               icon={<Clock className="w-5 h-5" />}
//               onClick={() => router.push('/dashboard/expenses')}
//             />
//             <StatCard
//               title="New Users Today"
//               value={stats?.newUsersToday ?? 0}
//               icon={<Users className="w-6 h-6" />}
//               color="purple"
//               trend={{ value: 0, positive: true }}
//               onClick={() => router.push('/dashboard/clients')}
//             />
//             <StatCard
//               title="Expiring Today"
//               value={stats?.expireToday ?? 0}
//               icon={<AlertCircle className="w-6 h-6" />}
//               color="rose"
//               trend={{ value: 0, positive: false }}
//               onClick={() => router.push('/dashboard/clients?expiring=today')}
//             />
//           </div>
//         </Section>

//         {/* FINANCIAL METRICS */}
//         <Section
//           title="Financial Summary"
//           icon={<DollarSign className="w-5 h-5" />}
//           variant="default"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <FinCard
//               title="Total Revenue"
//               amount={stats?.totalRevenue ?? 0}
//               type="income"
//               icon={<ArrowUpRight className="w-5 h-5" />}
//               onClick={() => router.push('/dashboard/payments')}
//             />
//             <FinCard
//               title="Total Expenses"
//               amount={stats?.totalExpenses ?? 0}
//               type="due"
//               icon={<Clock className="w-5 h-5" />}
//               onClick={() => router.push('/dashboard/expenses')}
//             />
//             <FinCard
//               title="Net Profit"
//               amount={stats?.netProfit ?? 0}
//               type={stats?.netProfit && stats.netProfit >= 0 ? "income" : "due"}
//               icon={<TrendingUp className="w-5 h-5" />}
//               onClick={() => router.push('/dashboard/payments')}
//             />
//           </div>
//         </Section>

//         {/* ACCOUNTS SUMMARY */}
//         <AccountsSummary />

//         {/* CHARTS SECTION */}
//         <div className="grid grid-cols-1 gap-4 sm:gap-6">
//           <ChartCard
//             title="Revenue vs Expenses (Monthly)"
//             type="line"
//             labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']}
//             datasets={[
//               {
//                 label: 'Revenue',
//                 data: [120000, 150000, 180000, 140000, 200000, 220000],
//                 backgroundColor: 'rgba(72, 187, 120, 0.2)',
//                 borderColor: 'rgba(72, 187, 120, 1)',
//               },
//               {
//                 label: 'Expenses',
//                 data: [80000, 90000, 100000, 85000, 110000, 120000],
//                 backgroundColor: 'rgba(239, 68, 68, 0.2)',
//                 borderColor: 'rgba(239, 68, 68, 1)',
//               }
//             ]}
//           />
//           <ChartCard
//             title="New Users Growth"
//             type="bar"
//             labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']}
//             datasets={[
//               {
//                 label: 'New Users',
//                 data: [45, 52, 48, 60, 65, 72],
//                 backgroundColor: 'rgba(59, 130, 246, 0.6)',
//               }
//             ]}
//           />
//         </div>

//         {/* AREA-BASED INSIGHTS */}
//         <div className="grid grid-cols-1 gap-4 sm:gap-6">
//           <AreaInsights />
//           <ActivityFeed />
//         </div>

//         {/* INVENTORY OVERVIEW */}
//         <Section
//           title="Inventory Overview"
//           icon={<Package className="w-5 h-5" />}
//           variant="default"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <InventoryCard
//               title="Total Items"
//               value={stats?.totalInventoryItems ?? 0}
//               icon={<Package className="w-6 h-6" />}
//               color="blue"
//               onClick={() => router.push('/dashboard/inventory')}
//             />
//             <InventoryCard
//               title="Low Stock Items"
//               value={stats?.lowStockItems ?? 0}
//               icon={<AlertTriangle className="w-6 h-6" />}
//               color="amber"
//               onClick={() => router.push('/dashboard/inventory')}
//             />
//             <InventoryCard
//               title="Total Value"
//               value={stats?.totalInventoryValue ?? 0}
//               icon={<DollarSign className="w-6 h-6" />}
//               color="emerald"
//               subtitle="Rs"
//               onClick={() => router.push('/dashboard/inventory')}
//             />
//           </div>
//         </Section>

//         {/* EMPLOYEE OVERVIEW */}
//         <Section
//           title="Employee Overview"
//           icon={<Users className="w-5 h-5" />}
//           variant="default"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <EmployeeCard
//               title="Total Employees"
//               value={stats?.totalEmployees ?? 0}
//               icon={<Users className="w-6 h-6" />}
//               color="purple"
//               onClick={() => router.push('/dashboard/employees')}
//             />
//             <EmployeeCard
//               title="Admins"
//               value={stats?.employeeRoles?.find(r => r.role === 'ADMIN')?._count._all ?? 0}
//               icon={<Shield className="w-6 h-6" />}
//               color="indigo"
//               onClick={() => router.push('/dashboard/employees')}
//             />
//             <EmployeeCard
//               title="Staff"
//               value={stats?.employeeRoles?.find(r => r.role === 'EMPLOYEE')?._count._all ?? 0}
//               icon={<User className="w-6 h-6" />}
//               color="blue"
//               onClick={() => router.push('/dashboard/employees')}
//             />
//           </div>
//         </Section>

//         {/* EXPIRATION ALERTS */}
//         <Section
//           title="Expiration Alerts"
//           icon={<AlertCircle className="w-5 h-5" />}
//           variant="warning"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <AlertCard
//               title="Expiring Today"
//               value={stats?.expireToday ?? 0}
//               urgency="critical"
//               message={
//                 stats?.expireToday
//                   ? "Immediate action required"
//                   : "All clear! 🎉"
//               }
//               onClick={() => router.push('/dashboard/clients?expiring=today')}
//             />
//             <AlertCard
//               title="Next 3 Days"
//               value={stats?.expireNext3Days ?? 0}
//               urgency="high"
//               message="Plan renewals ahead"
//               onClick={() => router.push('/dashboard/clients?expiring=3days')}
//             />
//             <AlertCard
//               title="Next 7 Days"
//               value={stats?.expireNext7Days ?? 0}
//               urgency="medium"
//               message="Prepare follow-ups"
//               onClick={() => router.push('/dashboard/clients?expiring=7days')}
//             />
//           </div>
//         </Section>

//         {/* REVENUE METRICS */}
//         <Section
//           title="Revenue Overview"
//           icon={<DollarSign className="w-5 h-5" />}
//           variant="success"
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//             <FinCard
//               title="Paid Today"
//               amount={stats?.paidToday ?? 0}
//               type="income"
//               icon={<ArrowUpRight className="w-5 h-5" />}
//               onClick={() => router.push('/dashboard/payments')}
//             />
//             <FinCard
//               title="Due Today"
//               amount={stats?.dueToday ?? 0}
//               type="due"
//               icon={<Clock className="w-5 h-5" />}
//               onClick={() => router.push('/dashboard/payments')}
//             />
//             <FinCard
//               title="Due Next 7 Days"
//               amount={stats?.dueNext7Days ?? 0}
//               type="upcoming"
//               icon={<Calendar className="w-5 h-5" />}
//               onClick={() => router.push('/dashboard/payments')}
//             />
//           </div>
//         </Section>

//         {/* EXPIRING CLIENTS TABLE */}
//         <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
//           <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-purple-50/50 to-transparent">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-purple-100 rounded-lg">
//                 <Calendar className="w-5 h-5 text-purple-600" />
//               </div>
//               <div>
//                 <h2 className="font-semibold text-slate-800">
//                   Clients Expiring Soon
//                 </h2>
//                 <p className="text-sm text-slate-500">
//                   Proactive retention opportunities
//                 </p>
//               </div>
//             </div>
//             <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
//               {expiringClients.length} clients
//             </span>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-slate-50/80">
//                 <tr className="text-left text-sm font-medium text-slate-500">
//                   <th className="px-6 py-4">Client</th>
//                   <th className="px-6 py-4">Contact</th>
//                   <th className="px-6 py-4">Package</th>
//                   <th className="px-6 py-4">Expiry Date</th>
//                   <th className="px-6 py-4">Status</th>
//                   <th className="px-6 py-4">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {expiringClients?.length ? (
//                   expiringClients.map((client, index) => (
//                     <tr
//                       key={client.id}
//                       className="hover:bg-slate-50/80 transition-colors group"
//                       style={{ animationDelay: `${index * 50}ms` }}
//                     >
//                       <td className="px-6 py-4">
//                         <div className="flex items-center gap-3">
//                           <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-semibold text-slate-600">
//                             {client.name.charAt(0).toUpperCase()}
//                           </div>
//                           <span className="font-medium text-slate-800">
//                             {client.name}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 text-slate-600">
//                         {client.phone}
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-sm rounded-md font-medium">
//                           {client.package}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 text-slate-600">
//                         {new Date(client.expiryDate).toLocaleDateString(
//                           "en-US",
//                           {
//                             month: "short",
//                             day: "numeric",
//                             year: "numeric",
//                           },
//                         )}
//                       </td>
//                       <td className="px-6 py-4">
//                         <StatusBadge daysLeft={client.daysLeft} />
//                       </td>
//                       {/* =============== WhatsApp and Email Logic here ====================== */}
//                       <td className="px-6 py-4">
//                         <div className="flex gap-2  transition-all duration-200">
//                           {/* WhatsApp */}
//                           <a
//                             href={`https://wa.me/${client.phone}?text=${encodeURIComponent(
//                               `Hello ${client.name}, your internet package "${client.package}" will expire on ${new Date(
//                                 client.expiryDate,
//                               ).toLocaleDateString()}. Please renew to avoid service interruption.`,
//                             )}`}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                             className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
//       text-white bg-green-500 hover:bg-green-600
//       rounded-full shadow-sm hover:shadow-md
//       transition-all duration-200"
//                           >
//                             <MessageCircle className="w-3.5 h-3.5" />
//                             WhatsApp
//                           </a>

//                           {/* Email */}
//                           <a
//                             href={`mailto:${client.email}?subject=${encodeURIComponent(
//                               "Internet Package Expiry Reminder",
//                             )}&body=${encodeURIComponent(
//                               `Hello ${client.name},

// Your internet package "${client.package}" will expire on ${new Date(
//                                 client.expiryDate,
//                               ).toLocaleDateString()}.

// Please renew your package to avoid service interruption.

// Thank you.`,
//                             )}`}
//                             className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
//       text-white bg-blue-500 hover:bg-blue-600
//       rounded-full shadow-sm hover:shadow-md
//       transition-all duration-200"
//                           >
//                             <Mail className="w-3.5 h-3.5" />
//                             Email
//                           </a>
//                         </div>
//                       </td>
//                       {/* ==================================================================== */}
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={6} className="px-6 py-12 text-center">
//                       <div className="flex flex-col items-center gap-3 text-slate-400">
//                         <UserCheck className="w-12 h-12 opacity-50" />
//                         <p className="font-medium">No expiring clients</p>
//                         <p className="text-sm">
//                           All your clients are up to date! 🎉
//                         </p>
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// /* ==================== REUSABLE COMPONENTS ==================== */

// function InventoryCard({
//   title,
//   value,
//   icon,
//   color,
//   subtitle,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo";
//   subtitle?: string;
//   onClick?: () => void;
// }) {
//   const colors = {
//     blue: {
//       bg: "from-blue-50 to-blue-100/50",
//       icon: "bg-blue-500",
//       text: "text-blue-600",
//       border: "border-blue-200",
//     },
//     emerald: {
//       bg: "from-emerald-50 to-emerald-100/50",
//       icon: "bg-emerald-500",
//       text: "text-emerald-600",
//       border: "border-emerald-200",
//     },
//     rose: {
//       bg: "from-rose-50 to-rose-100/50",
//       icon: "bg-rose-500",
//       text: "text-rose-600",
//       border: "border-rose-200",
//     },
//     amber: {
//       bg: "from-amber-50 to-amber-100/50",
//       icon: "bg-amber-500",
//       text: "text-amber-600",
//       border: "border-amber-200",
//     },
//     purple: {
//       bg: "from-purple-50 to-purple-100/50",
//       icon: "bg-purple-500",
//       text: "text-purple-600",
//       border: "border-purple-200",
//     },
//     indigo: {
//       bg: "from-indigo-50 to-indigo-100/50",
//       icon: "bg-indigo-500",
//       text: "text-indigo-600",
//       border: "border-indigo-200",
//     },
//   };

//   const c = colors[color];

//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
//       onClick={onClick}
//     >
//       {/* Decorative gradient blob */}
//       <div
//         className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
//       />

//       <div className="relative flex items-start justify-between">
//         <div className="space-y-1">
//           <p className="text-sm font-medium text-slate-500">{title}</p>
//           <p className="text-3xl font-bold text-slate-800 tracking-tight">
//             {value.toLocaleString()}
//           </p>
//           {subtitle && (
//             <p className="text-xs text-slate-400">{subtitle}</p>
//           )}
//         </div>

//         <div
//           className={`p-3 rounded-xl bg-linear-to-br ${c.icon} shadow-lg shadow-${color}-500/25 text-white`}
//         >
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }

// function EmployeeCard({
//   title,
//   value,
//   icon,
//   color,
//   subtitle,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple" | "indigo";
//   subtitle?: string;
//   onClick?: () => void;
// }) {
//   const colors = {
//     blue: {
//       bg: "from-blue-50 to-blue-100/50",
//       icon: "bg-blue-500",
//       text: "text-blue-600",
//       border: "border-blue-200",
//     },
//     emerald: {
//       bg: "from-emerald-50 to-emerald-100/50",
//       icon: "bg-emerald-500",
//       text: "text-emerald-600",
//       border: "border-emerald-200",
//     },
//     rose: {
//       bg: "from-rose-50 to-rose-100/50",
//       icon: "bg-rose-500",
//       text: "text-rose-600",
//       border: "border-rose-200",
//     },
//     amber: {
//       bg: "from-amber-50 to-amber-100/50",
//       icon: "bg-amber-500",
//       text: "text-amber-600",
//       border: "border-amber-200",
//     },
//     purple: {
//       bg: "from-purple-50 to-purple-100/50",
//       icon: "bg-purple-500",
//       text: "text-purple-600",
//       border: "border-purple-200",
//     },
//     indigo: {
//       bg: "from-indigo-50 to-indigo-100/50",
//       icon: "bg-indigo-500",
//       text: "text-indigo-600",
//       border: "border-indigo-200",
//     },
//   };

//   const c = colors[color];

//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
//       onClick={onClick}
//     >
//       {/* Decorative gradient blob */}
//       <div
//         className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
//       />

//       <div className="relative flex items-start justify-between">
//         <div className="space-y-1">
//           <p className="text-sm font-medium text-slate-500">{title}</p>
//           <p className="text-3xl font-bold text-slate-800 tracking-tight">
//             {value.toLocaleString()}
//           </p>
//           {subtitle && (
//             <p className="text-xs text-slate-400">{subtitle}</p>
//           )}
//         </div>

//         <div
//           className={`p-3 rounded-xl bg-linear-to-br ${c.icon} shadow-lg shadow-${color}-500/25 text-white`}
//         >
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }

// function Section({
//   title,
//   icon,
//   children,
//   variant = "default",
// }: {
//   title: string;
//   icon: React.ReactNode;
//   children: React.ReactNode;
//   variant?: "default" | "warning" | "success";
// }) {
//   const variants = {
//     default: "from-slate-800 to-slate-600",
//     warning: "from-amber-600 to-orange-500",
//     success: "from-emerald-600 to-teal-500",
//   };

//   return (
//     <section className="space-y-4">
//       <div className="flex items-center gap-2">
//         <div
//           className={`p-2 rounded-lg bg-linear-to-br ${variants[variant]} shadow-lg`}
//         >
//           <div className="text-white">{icon}</div>
//         </div>
//         <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
//       </div>
//       {children}
//     </section>
//   );
// }

// function StatCard({
//   title,
//   value,
//   icon,
//   color,
//   trend,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   icon: React.ReactNode;
//   color: "blue" | "emerald" | "rose" | "amber" | "purple";
//   trend?: { value: number; positive: boolean };
//   onClick?: () => void;
// }) {
//   const colors = {
//     blue: {
//       bg: "from-blue-50 to-blue-100/50",
//       icon: "bg-blue-500",
//       text: "text-blue-600",
//       border: "border-blue-200",
//     },
//     emerald: {
//       bg: "from-emerald-50 to-emerald-100/50",
//       icon: "bg-emerald-500",
//       text: "text-emerald-600",
//       border: "border-emerald-200",
//     },
//     rose: {
//       bg: "from-rose-50 to-rose-100/50",
//       icon: "bg-rose-500",
//       text: "text-rose-600",
//       border: "border-rose-200",
//     },
//     amber: {
//       bg: "from-amber-50 to-amber-100/50",
//       icon: "bg-amber-500",
//       text: "text-amber-600",
//       border: "border-amber-200",
//     },
//     purple: {
//       bg: "from-purple-50 to-purple-100/50",
//       icon: "bg-purple-500",
//       text: "text-purple-600",
//       border: "border-purple-200",
//     },
//   };

//   const c = colors[color];

//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
//       onClick={onClick}
//     >
//       {/* Decorative gradient blob */}
//       <div
//         className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
//       />

//       <div className="relative flex items-start justify-between">
//         <div className="space-y-1">
//           <p className="text-sm font-medium text-slate-500">{title}</p>
//           <p className="text-3xl font-bold text-slate-800 tracking-tight">
//             {value.toLocaleString()}
//           </p>

//           {trend && (
//             <div
//               className={`flex items-center gap-1 text-sm ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}
//             >
//               {trend.positive ? (
//                 <ArrowUpRight className="w-4 h-4" />
//               ) : (
//                 <ArrowDownRight className="w-4 h-4" />
//               )}
//               <span className="font-medium">{trend.value}%</span>
//               <span className="text-slate-400">vs last week</span>
//             </div>
//           )}
//         </div>

//         <div
//           className={`p-3 rounded-xl bg-linear-to-br ${c.icon} shadow-lg shadow-${color}-500/25 text-white`}
//         >
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }

// function AlertCard({
//   title,
//   value,
//   urgency,
//   message,
//   onClick,
// }: {
//   title: string;
//   value: number;
//   urgency: "critical" | "high" | "medium";
//   message: string;
//   onClick?: () => void;
// }) {
//   const urgencies = {
//     critical: {
//       bg: "from-rose-500 to-pink-500",
//       ring: "ring-rose-200",
//       text: "text-rose-600",
//       badge: "bg-rose-100 text-rose-700",
//     },
//     high: {
//       bg: "from-amber-500 to-orange-500",
//       ring: "ring-amber-200",
//       text: "text-amber-600",
//       badge: "bg-amber-100 text-amber-700",
//     },
//     medium: {
//       bg: "from-blue-500 to-cyan-500",
//       ring: "ring-blue-200",
//       text: "text-blue-600",
//       badge: "bg-blue-100 text-blue-700",
//     },
//   };

//   const u = urgencies[urgency];

//   return (
//     <div
//       className={`relative bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 overflow-hidden group ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
//       onClick={onClick}
//     >
//       <div
//         className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${u.bg}`}
//       />

//       <div className="flex items-start justify-between mb-3">
//         <div className={`p-2 rounded-lg ring-4 ${u.ring}`}>
//           <AlertCircle className={`w-5 h-5 ${u.text}`} />
//         </div>
//         {value > 0 && (
//           <span
//             className={`px-2.5 py-1 text-xs font-semibold rounded-full ${u.badge}`}
//           >
//             {value} clients
//           </span>
//         )}
//       </div>

//       <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
//       <p className="text-3xl font-bold text-slate-800 mb-2">{value}</p>
//       <p className="text-sm text-slate-500">{message}</p>

//       {/* Progress indicator */}
//       {value > 0 && (
//         <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
//           <div
//             className={`h-full bg-linear-to-r ${u.bg} transition-all duration-500`}
//             style={{ width: `${Math.min(value * 15, 100)}%` }}
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// function FinanceCard({
//   title,
//   amount,
//   type,
//   icon,
//   onClick,
// }: {
//   title: string;
//   amount: number;
//   type: "income" | "due" | "upcoming";
//   icon: React.ReactNode;
//   onClick?: () => void;
// }) {
//   const types = {
//     income: {
//       color: "text-emerald-600",
//       bg: "bg-emerald-50",
//       border: "border-emerald-200",
//     },
//     due: {
//       color: "text-rose-600",
//       bg: "bg-rose-500",
//       border: "border-rose-200",
//     },
//     upcoming: {
//       color: "text-amber-600",
//       bg: "bg-amber-50",
//       border: "border-amber-200",
//     },
//   };

//   const t = types[type];

//   return (
//     <div
//       className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
//       onClick={onClick}
//     >
//       <div className="flex items-center justify-between mb-4">
//         <div className={`p-2.5 rounded-xl ${t.bg} ${t.color}`}>{icon}</div>
//         <TrendingUp className={`w-5 h-5 ${t.color} opacity-60`} />
//       </div>

//       <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
//       <p className="text-2xl font-bold text-slate-800">
//         Rs {amount.toLocaleString("en-PK")}
//       </p>

//       <div className={`mt-3 pt-3 border-t ${t.border}`}>
//         <div className="flex items-center gap-2 text-sm">
//           <div
//             className={`w-2 h-2 rounded-full ${type === "income" ? "bg-emerald-500" : type === "due" ? "bg-rose-500" : "bg-amber-500"}`}
//           />
//           <span className={t.color}>
//             {type === "income"
//               ? "Received"
//               : type === "due"
//                 ? "Pending"
//                 : "Forecasted"}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// function StatusBadge({ daysLeft }: { daysLeft: number }) {
//   if (daysLeft <= 0) {
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
//         Expired
//       </span>
//     );
//   }
//   if (daysLeft <= 1) {
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
//         {daysLeft} day left
//       </span>
//     );
//   }
//   if (daysLeft <= 3) {
//     return (
//       <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
//         <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
//         {daysLeft} days left
//       </span>
//     );
//   }
//   return (
//     <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
//       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
//       {daysLeft} days left
//     </span>
//   );
// }

// /* ==================== SKELETON LOADING ==================== */

// function DashboardSkeleton() {
//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 animate-pulse">
//       {/* Header Skeleton */}
//       <header className="sticky top-0 z-40 bg-white/80 border-b border-slate-200/60 px-8 py-4">
//         <div className="max-w-7xl mx-auto flex items-center justify-between">
//           <div className="space-y-2">
//             <div className="h-7 w-48 bg-slate-200 rounded" />
//             <div className="h-4 w-72 bg-slate-100 rounded" />
//           </div>
//           <div className="flex items-center gap-4">
//             <div className="h-8 w-40 bg-slate-100 rounded-full" />
//             <div className="w-10 h-10 rounded-full bg-slate-200" />
//           </div>
//         </div>
//       </header>

//       <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
//         {[1, 2, 3].map((section) => (
//           <div key={section} className="space-y-4">
//             <div className="flex items-center gap-2">
//               <div className="w-9 h-9 bg-slate-200 rounded-lg" />
//               <div className="h-5 w-40 bg-slate-200 rounded" />
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
//               {[1, 2, 3].map((card) => (
//                 <div
//                   key={card}
//                   className="bg-white rounded-2xl p-5 border border-slate-200"
//                 >
//                   <div className="flex justify-between">
//                     <div className="space-y-3">
//                       <div className="h-4 w-24 bg-slate-100 rounded" />
//                       <div className="h-8 w-16 bg-slate-200 rounded" />
//                       <div className="h-3 w-32 bg-slate-100 rounded" />
//                     </div>
//                     <div className="w-12 h-12 bg-slate-100 rounded-xl" />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}

//         {/* Table Skeleton */}
//         <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
//           <div className="px-6 py-5 border-b border-slate-100">
//             <div className="h-5 w-48 bg-slate-200 rounded" />
//           </div>
//           <div className="p-6 space-y-4">
//             {[1, 2, 3, 4].map((row) => (
//               <div key={row} className="flex items-center gap-4">
//                 <div className="w-9 h-9 rounded-full bg-slate-100" />
//                 <div className="flex-1 space-y-2">
//                   <div className="h-4 w-32 bg-slate-100 rounded" />
//                   <div className="h-3 w-24 bg-slate-50 rounded" />
//                 </div>
//                 <div className="h-6 w-20 bg-slate-100 rounded-full" />
//               </div>
//             ))}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
