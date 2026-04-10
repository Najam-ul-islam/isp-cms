'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Package,
  LogOut,
  ChevronRight,
  ChevronDown,
  Wifi,
  Factory,
  DollarSign,
  CreditCard,
  TrendingUp,
  Package as PackageIcon,
  ShoppingCart,
  Menu,
  X,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  User,
  Shield
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  hasSubmenu?: boolean
  submenu?: Array<{
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }>
}

export default function ResponsiveSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { user, isLoading: userLoading } = useCurrentUser()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [packagesExpanded, setPackagesExpanded] = useState(false)
  const [isCollapsible, setIsCollapsible] = useState(false)
  
  const sidebarRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Check if mobile screen
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      const collapsible = window.innerWidth >= 1024 && window.innerWidth < 1280
      
      setIsMobile(mobile)
      setIsCollapsible(collapsible)
      
      // On mobile, always close sidebar initially
      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Auto-expand Packages when on service-providers page
  useEffect(() => {
    if (pathname === '/dashboard/service-providers') {
      setPackagesExpanded(true)
    }
  }, [pathname])

  // Close sidebar on Escape key (mobile)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobile, sidebarOpen])

  // Trap focus in sidebar when open on mobile
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return

    const sidebar = sidebarRef.current
    if (!sidebar) return

    const focusableElements = sidebar.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isMobile, sidebarOpen])

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      router.push('/login')
      router.refresh()
    }
  }, [router])

  const navItems: NavItem[] = [
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
      icon: Package,
      hasSubmenu: true,
      submenu: [
        {
          href: '/dashboard/packages',
          label: 'All Packages',
          icon: Package
        },
        {
          href: '/dashboard/service-providers',
          label: 'Service Providers',
          icon: Factory
        }
      ]
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

  const isActive = (href: string) => pathname === href

  // Get user initials for avatar
  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'from-amber-500 to-orange-500';
      case 'ADMIN':
        return 'from-blue-500 to-indigo-500';
      case 'EMPLOYEE':
        return 'from-emerald-500 to-teal-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-200 shadow-lg border border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Sidebar backdrop (mobile) */}
      {isMobile && sidebarOpen && (
        <div
          ref={overlayRef}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          fixed lg:static z-40 h-screen
          bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900/95
          border-r border-gray-200/80 dark:border-gray-700/80
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isMobile ? 'w-72' : ''}
          ${!isMobile && !sidebarOpen ? 'w-16' : ''}
          ${!isMobile && sidebarOpen ? 'w-60' : ''}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          ${isMobile ? 'left-0 top-0' : ''}
          shadow-xl lg:shadow-sm
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo/Header */}
        <div className="p-3 border-b border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-r from-blue-50/50 to-purple-50/30 dark:from-blue-900/20 dark:to-purple-900/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md shadow-blue-500/30 flex-shrink-0 transition-transform duration-200 hover:scale-110 hover:shadow-xl">
              <Wifi className="w-4 h-4 text-white" />
            </div>
            {(!isMobile && sidebarOpen) && (
              <div className="overflow-hidden animate-in slide-in-from-left duration-300">
                <h1 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">ISP Admin</h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Control Panel</p>
              </div>
            )}
            {!isMobile && isCollapsible && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent" role="menubar">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const hasSubmenu = item.hasSubmenu && item.submenu
            const isPackagesExpanded = hasSubmenu && packagesExpanded

            return (
              <div key={item.href} role="none">
                <Link
                  href={hasSubmenu ? '#' : item.href}
                  onClick={(e) => {
                    if (hasSubmenu) {
                      e.preventDefault()
                      setPackagesExpanded(!packagesExpanded)
                    } else if (isMobile) {
                      setSidebarOpen(false)
                    }
                  }}
                  className={`
                    group flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                    transition-all duration-200 ease-in-out
                    ${!isMobile && !sidebarOpen ? 'justify-center px-2' : ''}
                    ${active && !hasSubmenu
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30 hover:from-blue-700 hover:to-blue-800'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:shadow-sm'
                    }
                  `}
                  role="menuitem"
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-all duration-200 ${
                    active && !hasSubmenu ? 'scale-110' : 'group-hover:scale-110'
                  }`} />

                  {(!isMobile && sidebarOpen) && (
                    <>
                      <span className="font-medium flex-1 text-xs">{item.label}</span>
                      {hasSubmenu && (
                        <div className={`transition-transform duration-200 ${isPackagesExpanded ? 'rotate-0' : '-rotate-90'}`}>
                          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                        </div>
                      )}
                    </>
                  )}
                </Link>

                {/* Submenu items */}
                {hasSubmenu && isPackagesExpanded && (!isMobile && sidebarOpen) && (
                  <div className="ml-3 mt-0.5 space-y-0.5 animate-in slide-in-from-top-2 duration-200" role="menu">
                    {item.submenu!.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = isActive(subItem.href)
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`
                            group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg
                            transition-all duration-200
                            ${isSubActive
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
                            }
                          `}
                          role="menuitem"
                          aria-current={isSubActive ? 'page' : undefined}
                          onClick={() => isMobile && setSidebarOpen(false)}
                        >
                          <SubIcon className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:scale-110" />
                          <span className="text-xs font-medium">{subItem.label}</span>
                          {isSubActive && (
                            <ChevronRight className="w-3 h-3 ml-auto opacity-70" />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer Section */}
        <div className="border-t border-gray-200/80 dark:border-gray-700/80 p-2 space-y-1.5 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-gray-900/50">
          {/* Theme Toggle */}
          {(!isMobile && sidebarOpen) && (
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80
                transition-all duration-200 hover:shadow-sm group"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <div className="transition-transform duration-200 group-hover:scale-110">
                {theme === 'light' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs font-medium">
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </button>
          )}

          {/* User Profile */}
          {userLoading ? (
            <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100/70 dark:from-gray-800/80 dark:to-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 ${!isMobile && !sidebarOpen ? 'justify-center border-0' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
              {(!isMobile && sidebarOpen) && (
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-2 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              )}
            </div>
          ) : user ? (
            <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100/70 dark:from-gray-800/80 dark:to-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 ${!isMobile && !sidebarOpen ? 'justify-center border-0' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md hover:shadow-lg transition-shadow duration-200">
                {getUserInitials(user.name)}
              </div>
              {(!isMobile && sidebarOpen) && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full bg-gradient-to-r ${getRoleBadgeColor(user.role)} text-white flex-shrink-0`}>
                      {user.role.replace('_', ' ').slice(0, 3)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-rose-50 to-rose-100/70 dark:from-rose-900/20 dark:to-rose-900/10 border border-rose-200/60 dark:border-rose-700/60 ${!isMobile && !sidebarOpen ? 'justify-center border-0' : ''}`}>
              <User className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
              {(!isMobile && sidebarOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 truncate">Not logged in</p>
                  <p className="text-[10px] text-rose-400 dark:text-rose-500 truncate">Please sign in</p>
                </div>
              )}
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
              text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400
              transition-all duration-200 hover:shadow-sm group
              ${!isMobile && !sidebarOpen ? 'justify-center' : ''}
            `}
            aria-label="Logout"
          >
            <LogOut className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 group-hover:translate-x-0.5 ${!isMobile && !sidebarOpen ? '' : ''}`} />
            {(!isMobile && sidebarOpen) && <span className="text-xs font-medium">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
