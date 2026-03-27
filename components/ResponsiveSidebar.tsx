'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Package,
  LogOut,
  ChevronRight,
  Wifi,
  Factory,
  DollarSign,
  CreditCard,
  TrendingUp,
  Package as PackageIcon,
  ShoppingCart,
  BadgePercent,
  Menu,
  X
} from 'lucide-react'

export default function ResponsiveSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile screen
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
      // On mobile, always close sidebar initially
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        // On desktop, keep sidebar open by default
        setSidebarOpen(true);
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      href: '/dashboard/clients',
      label: 'Clients',
      icon: Users
    },
    {
      href: '/dashboard/packages',
      label: 'Packages',
      icon: Package
    },
    {
      href: '/dashboard/payments',
      label: 'Payments',
      icon: CreditCard
    },
    {
      href: '/dashboard/expenses',
      label: 'Expenses',
      icon: DollarSign
    },
    {
      href: '/dashboard/reports',
      label: 'Reports',
      icon: TrendingUp
    },
    {
      href: '/dashboard/complaints',
      label: 'Complaints',
      icon: Users
    },
    {
      href: '/dashboard/service-providers',
      label: 'Service Providers',
      icon: Factory
    },
    {
      href: '/dashboard/inventory',
      label: 'Inventory',
      icon: PackageIcon
    },
    {
      href: '/dashboard/employees',
      label: 'Employees',
      icon: Users
    },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 text-white shadow-lg"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop toggle button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden lg:block fixed top-4 left-4 z-40 p-2 rounded-lg bg-gray-800 text-white shadow-lg"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static z-40 h-screen w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'w-20'} lg:w-auto
          flex flex-col shadow-xl border-r border-gray-700/50
        `}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
              <Wifi className="w-6 h-6 text-white" />
            </div>
            <div className={`${sidebarOpen ? '' : 'hidden'}`}>
              <h1 className="text-lg font-bold tracking-tight">ISP Admin</h1>
              <p className="text-xs text-gray-400">Control Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <p className={`${sidebarOpen ? 'px-4 py-3' : 'p-3'} text-xs font-semibold text-gray-400 uppercase tracking-wider ${sidebarOpen ? '' : 'hidden'}`}>
            Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 ease-in-out
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
                  }
                  ${sidebarOpen ? 'mx-2' : 'justify-center'}
                `}
                onClick={() => isMobile && setSidebarOpen(false)} // Close sidebar on mobile after clicking
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${sidebarOpen ? '' : 'mx-auto'}`} />
                <span className={`font-medium ${sidebarOpen ? '' : 'hidden'}`}>{item.label}</span>
                {sidebarOpen && isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Section & Logout */}
        <div className="border-t border-gray-700/50 space-y-2">
          {/* Optional: User Profile Preview */}
          <div className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-700/30 ${sidebarOpen ? 'mx-2 mb-2' : 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              A
            </div>
            <div className={`${sidebarOpen ? '' : 'hidden'}`}>
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-gray-400 truncate">admin@isp.com</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-gray-300 hover:text-white hover:bg-red-500/20
              hover:shadow-lg hover:shadow-red-500/20
              transition-all duration-200 ease-in-out
              group
              ${sidebarOpen ? 'mx-2 w-auto' : 'justify-center w-full'}
            `}
          >
            <LogOut className={`w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200 ${sidebarOpen ? '' : 'mx-auto'}`} />
            <span className={`font-medium ${sidebarOpen ? '' : 'hidden'}`}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}