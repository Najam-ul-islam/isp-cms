"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FinCard from "@/components/FinCard";

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
} from "lucide-react";

interface StatsData {
  totalClients: number;
  activeClients: number;
  expiredClients: number;
  totalRevenue: number;
  totalUsers: number;
  activeUsers: number;
  expiredUsers: number;
  expireToday: number;
  expireNext3Days: number;
  expireNext7Days: number;
  paidToday: number;
  dueToday: number;
  dueNext7Days: number;
}

interface ExpiringClient {
  email: any;
  id: string;
  name: string;
  phone: string;
  package: string;
  expiryDate: string;
  daysLeft: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [expiringClients, setExpiringClients] = useState<ExpiringClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const router = useRouter();

  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const getHeaders = (): HeadersInit => {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          return headers;
        };

        const [statsRes, expiringRes] = await Promise.all([
          fetch("/api/dashboard/stats", {
            headers: getHeaders(),
            credentials: "include",
            cache: "no-store",
            signal: abortController.signal,
          }),
          fetch("/api/dashboard/expiring_clients", {
            headers: getHeaders(),
            credentials: "include",
            cache: "no-store",
            signal: abortController.signal,
          }),
        ]);

        if (statsRes.status === 401 || expiringRes.status === 401) {
          router.push("/login");
          return;
        }

        const statsData = await statsRes.json();
        const expiringData = await expiringRes.json();

        setStats(statsData);
        setExpiringClients(Array.isArray(expiringData) ? expiringData : []);
        setLastUpdated(new Date());
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Dashboard fetch error:", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => abortController.abort();
  }, [router]);

  const handleRefresh = () => {
    setLoading(true);
    window.location.reload();
  };

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Welcome back! Here's what's happening with your ISP today.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4" />
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/25">
              A
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* USER OVERVIEW */}
        <Section title="User Overview" icon={<Users className="w-5 h-5" />}>
          <div className="grid md:grid-cols-3 gap-5">
            <StatCard
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              icon={<Users className="w-6 h-6" />}
              color="blue"
              trend={{ value: 12, positive: true }}
            />
            <StatCard
              title="Active Users"
              value={stats?.activeUsers ?? 0}
              icon={<UserCheck className="w-6 h-6" />}
              color="emerald"
              trend={{ value: 8, positive: true }}
            />
            <StatCard
              title="Expired Users"
              value={stats?.expiredUsers ?? 0}
              icon={<UserX className="w-6 h-6" />}
              color="rose"
              trend={{ value: 3, positive: false }}
            />
          </div>
        </Section>

        {/* EXPIRATION ALERTS */}
        <Section
          title="Expiration Alerts"
          icon={<AlertCircle className="w-5 h-5" />}
          variant="warning"
        >
          <div className="grid md:grid-cols-3 gap-5">
            <AlertCard
              title="Expiring Today"
              value={stats?.expireToday ?? 0}
              urgency="critical"
              message={
                stats?.expireToday
                  ? "Immediate action required"
                  : "All clear! 🎉"
              }
            />
            <AlertCard
              title="Next 3 Days"
              value={stats?.expireNext3Days ?? 0}
              urgency="high"
              message="Plan renewals ahead"
            />
            <AlertCard
              title="Next 7 Days"
              value={stats?.expireNext7Days ?? 0}
              urgency="medium"
              message="Prepare follow-ups"
            />
          </div>
        </Section>

        {/* BILLING METRICS */}
        <Section
          title="Billing Overview"
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
        >
          <div className="grid md:grid-cols-3 gap-5">
            <FinCard
              title="Paid Today"
              amount={stats?.paidToday ?? 0}
              type="income"
              icon={<ArrowUpRight className="w-5 h-5" />}
            />
            <FinCard
              title="Due Today"
              amount={stats?.dueToday ?? 0}
              type="due"
              icon={<Clock className="w-5 h-5" />}
            />
            <FinCard
              title="Due Next 7 Days"
              amount={stats?.dueNext7Days ?? 0}
              type="upcoming"
              icon={<Calendar className="w-5 h-5" />}
            />
          </div>
        </Section>

        {/* EXPIRING CLIENTS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-purple-50/50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">
                  Clients Expiring Soon
                </h2>
                <p className="text-sm text-slate-500">
                  Proactive retention opportunities
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
              {expiringClients.length} clients
            </span>
          </div>

          <div className="overflow-x-auto">
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
                {expiringClients?.length ? (
                  expiringClients.map((client, index) => (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                      style={{ animationDelay: `${index * 50}ms` }}
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
                      {/* =============== WhatsApp and Email Logic here ====================== */}
                      <td className="px-6 py-4">
                        <div className="flex gap-2  transition-all duration-200">
                          {/* WhatsApp */}
                          <a
                            href={`https://wa.me/${client.phone}?text=${encodeURIComponent(
                              `Hello ${client.name}, your internet package "${client.package}" will expire on ${new Date(
                                client.expiryDate,
                              ).toLocaleDateString()}. Please renew to avoid service interruption.`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold 
      text-white bg-green-500 hover:bg-green-600 
      rounded-full shadow-sm hover:shadow-md 
      transition-all duration-200"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>

                          {/* Email */}
                          <a
                            href={`mailto:${client.email}?subject=${encodeURIComponent(
                              "Internet Package Expiry Reminder",
                            )}&body=${encodeURIComponent(
                              `Hello ${client.name},

Your internet package "${client.package}" will expire on ${new Date(
                                client.expiryDate,
                              ).toLocaleDateString()}.

Please renew your package to avoid service interruption.

Thank you.`,
                            )}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold 
      text-white bg-blue-500 hover:bg-blue-600 
      rounded-full shadow-sm hover:shadow-md 
      transition-all duration-200"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </a>
                        </div>
                      </td>
                      {/* ==================================================================== */}
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
        </div>
      </main>
    </div>
  );
}

/* ==================== REUSABLE COMPONENTS ==================== */

function Section({
  title,
  icon,
  children,
  variant = "default",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "warning" | "success";
}) {
  const variants = {
    default: "from-slate-800 to-slate-600",
    warning: "from-amber-600 to-orange-500",
    success: "from-emerald-600 to-teal-500",
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div
          className={`p-2 rounded-lg bg-linear-to-br ${variants[variant]} shadow-lg`}
        >
          <div className="text-white">{icon}</div>
        </div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
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
  trend,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "rose" | "amber" | "purple";
  trend?: { value: number; positive: boolean };
}) {
  const colors = {
    blue: {
      bg: "from-blue-50 to-blue-100/50",
      icon: "bg-blue-500",
      text: "text-blue-600",
      border: "border-blue-200",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100/50",
      icon: "bg-emerald-500",
      text: "text-emerald-600",
      border: "border-emerald-200",
    },
    rose: {
      bg: "from-rose-50 to-rose-100/50",
      icon: "bg-rose-500",
      text: "text-rose-600",
      border: "border-rose-200",
    },
    amber: {
      bg: "from-amber-50 to-amber-100/50",
      icon: "bg-amber-500",
      text: "text-amber-600",
      border: "border-amber-200",
    },
    purple: {
      bg: "from-purple-50 to-purple-100/50",
      icon: "bg-purple-500",
      text: "text-purple-600",
      border: "border-purple-200",
    },
  };

  const c = colors[color];

  return (
    <div
      className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden`}
    >
      {/* Decorative gradient blob */}
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-800 tracking-tight">
            {value.toLocaleString()}
          </p>

          {trend && (
            <div
              className={`flex items-center gap-1 text-sm ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}
            >
              {trend.positive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="font-medium">{trend.value}%</span>
              <span className="text-slate-400">vs last week</span>
            </div>
          )}
        </div>

        <div
          className={`p-3 rounded-xl bg-linear-to-br ${c.icon} shadow-lg shadow-${color}-500/25 text-white`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function AlertCard({
  title,
  value,
  urgency,
  message,
}: {
  title: string;
  value: number;
  urgency: "critical" | "high" | "medium";
  message: string;
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
      className={`relative bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 overflow-hidden group`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${u.bg}`}
      />

      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ring-4 ${u.ring}`}>
          <AlertCircle className={`w-5 h-5 ${u.text}`} />
        </div>
        {value > 0 && (
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${u.badge}`}
          >
            {value} clients
          </span>
        )}
      </div>

      <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-800 mb-2">{value}</p>
      <p className="text-sm text-slate-500">{message}</p>

      {/* Progress indicator */}
      {value > 0 && (
        <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-linear-to-r ${u.bg} transition-all duration-500`}
            style={{ width: `${Math.min(value * 15, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FinanceCard({
  title,
  amount,
  type,
  icon,
}: {
  title: string;
  amount: number;
  type: "income" | "due" | "upcoming";
  icon: React.ReactNode;
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
      className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${t.bg} ${t.color}`}>{icon}</div>
        <TrendingUp className={`w-5 h-5 ${t.color} opacity-60`} />
      </div>

      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-800">
        ${amount.toLocaleString()}
      </p>

      <div className={`mt-3 pt-3 border-t ${t.border}`}>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${type === "income" ? "bg-emerald-500" : type === "due" ? "bg-rose-500" : "bg-amber-500"}`}
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

function StatusBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Expired
      </span>
    );
  }
  if (daysLeft <= 1) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        {daysLeft} day left
      </span>
    );
  }
  if (daysLeft <= 3) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {daysLeft} days left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {daysLeft} days left
    </span>
  );
}

/* ==================== SKELETON LOADING ==================== */

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 animate-pulse">
      {/* Header Skeleton */}
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
            <div className="grid md:grid-cols-3 gap-5">
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

        {/* Table Skeleton */}
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
