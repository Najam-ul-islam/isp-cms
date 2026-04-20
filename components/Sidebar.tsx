'use client'

import { useState } from 'react'
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
  FileText
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: userLoading } = useCurrentUser()

  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'from-amber-500 to-orange-500';
      case 'ADMIN': return 'from-blue-500 to-indigo-500';
      case 'EMPLOYEE': return 'from-emerald-500 to-teal-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

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
      href: '/dashboard/quotations',
      label: 'Quotations',
      icon: FileText
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
      href: '/dashboard/product-sales',
      label: 'Product Sales',
      icon: ShoppingCart
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
    <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen flex flex-col shadow-xl border-r border-gray-700/50 overflow-hidden">
      {/* Logo/Header */}
      <div className="p-3 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-md shadow-blue-500/30">
            <Wifi className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">ISP Admin</h1>
            <p className="text-[9px] text-gray-500">Control Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0 overflow-y-auto">
        <p className="px-2 mb-1 text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
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
                group flex items-center gap-2 px-2 py-1.5 rounded-md
                transition-all duration-150 ease-in-out
                ${isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                }
              `}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3 h-3 ml-auto opacity-80" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Section & Logout */}
      <div className="p-2 border-t border-gray-700/50 space-y-1 flex-shrink-0">
        {/* User Profile */}
        {userLoading ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-700/30 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-gray-600 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2 w-14 bg-gray-600 rounded" />
              <div className="h-1.5 w-16 bg-gray-600 rounded" />
            </div>
          </div>
        ) : user ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-700/30">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {getUserInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-medium truncate">{user.name}</p>
                <span className={`text-[7px] font-bold px-0.5 py-0.5 rounded-full bg-gradient-to-r ${getRoleBadgeColor(user.role)} text-white flex-shrink-0`}>
                  {user.role.replace('_', ' ').slice(0, 3)}
                </span>
              </div>
              <p className="text-[9px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-red-900/20 border border-red-700/50">
            <div className="w-6 h-6 rounded-full bg-red-800/50 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] text-red-400">?</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-red-400 truncate">Not logged in</p>
              <p className="text-[8px] text-red-500 truncate">Please sign in</p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="
            w-full flex items-center gap-2 px-2 py-1.5 rounded-md
            text-gray-400 hover:text-red-400 hover:bg-red-500/10
            transition-all duration-150 ease-in-out
            group
          "
        >
          <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}