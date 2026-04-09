import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SaaSLayoutClient from "./SaaSLayoutClient";

export const dynamic = "force-dynamic";

export default async function SaaSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar - Server rendered */}
      <DesktopSidebar />

      {/* Client-side: mobile sidebar, header, theme toggle */}
      <SaaSLayoutClient />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-gray-800 border-r border-gray-200/60 dark:border-gray-700 flex-shrink-0">
      <div className="px-6 py-5 border-b border-gray-200/60 dark:border-gray-700/60">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
          SaaS Admin
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Platform Management</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <DesktopNavLink href="/saas/dashboard">Dashboard</DesktopNavLink>
        <DesktopNavLink href="/saas/companies">Companies</DesktopNavLink>
        <DesktopNavLink href="/saas/plans">Plans</DesktopNavLink>
        <DesktopNavLink href="/saas/subscriptions">Subscriptions</DesktopNavLink>
        <DesktopNavLink href="/saas/admins">Admins</DesktopNavLink>
        <DesktopNavLink href="/saas/financial-reports">Financial Reports</DesktopNavLink>
        <DesktopNavLink href="/saas/audit-logs">Audit Logs</DesktopNavLink>
      </nav>
      <div className="px-3 py-4 border-t border-gray-200/60 dark:border-gray-700/60">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
          >
            {/* Inline SVG instead of Lucide component to avoid serialization */}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v-8m0 0V5m0 4h6" />
            </svg>
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

function DesktopNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200"
    >
      <span className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-600" />
      {children}
    </Link>
  );
}

async function logoutAction() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  redirect("/login");
}
