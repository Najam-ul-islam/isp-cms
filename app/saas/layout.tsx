import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Activity,
  LogOut,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SaaSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleLogout = async () => {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    redirect("/login");
  };

  const navItems = [
    { href: "/saas/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/saas/companies", icon: Building2, label: "Companies" },
    { href: "/saas/plans", icon: CreditCard, label: "Plans" },
    { href: "/saas/subscriptions", icon: DollarSign, label: "Subscriptions" },
    { href: "/saas/admins", icon: Users, label: "Admins" },
    { href: "/saas/financial-reports", icon: FileText, label: "Financial Reports" },
    { href: "/saas/audit-logs", icon: Activity, label: "Audit Logs" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">SaaS Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Platform Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <form action={handleLogout}>
            <button
              type="submit"
              className="flex items-center gap-3 px-4 py-3 w-full text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
