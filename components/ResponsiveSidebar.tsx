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
  Shield,
  MapPin,
  FileText,
  Clock
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

      // On all screen sizes, show full sidebar by default
      setSidebarOpen(true)
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
      href: '/dashboard/quotations',
      label: 'Invoice',
      icon: FileText
    },
    {
      href: '/dashboard/areas',
      label: 'Areas',
      icon: MapPin
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
      href: '/dashboard/arrears',
      label: 'Arrears',
      icon: Clock
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
      {/* Mobile menu button - Premium glass morphism */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-5 left-4 z-70 p-2.5 rounded-xl
            bg-white/80 dark:bg-gray-800/80 backdrop-blur-md
            text-gray-700 dark:text-gray-200
            shadow-lg shadow-gray-900/10 dark:shadow-black/30
            border border-gray-200/60 dark:border-gray-700/60
            hover:border-blue-500/60 dark:hover:border-blue-400/60
            hover:bg-blue-50/50 dark:hover:bg-blue-900/20
            hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10
            transition-all duration-200 ease-out hover:scale-105 active:scale-95"
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

      {/* Sidebar - Premium Financial SaaS Design */}
      <aside
        ref={sidebarRef}
        className={`
          fixed lg:static z-60 h-screen
          bg-gradient-to-br from-gray-50/80 to-white dark:from-gray-900 dark:to-gray-900/95
          backdrop-blur-xl
          border-r border-gray-200/60 dark:border-gray-700/60
          flex flex-col
          transition-all duration-300 ease-out
          ${isMobile ? 'w-72' : 'w-64'}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          ${isMobile ? 'left-0 top-0' : ''}
          shadow-xl shadow-gray-900/5 dark:shadow-black/20 lg:shadow-sm
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo/Header - Premium glass card */}
        <div className="px-4 py-3 sm:py-3.5 border-b border-gray-200/60 dark:border-gray-700/60
          bg-gradient-to-r from-blue-50/40 via-violet-50/30 to-purple-50/40
          dark:from-blue-900/20 dark:via-violet-900/15 dark:to-purple-900/20
          backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative p-2 bg-gradient-to-brr from-blue-600 via-blue-700 to-violet-600 
              rounded-xl shadow-lg shadow-blue-500/30 dark:shadow-blue-400/20
              shrink-0 transition-all duration-200 ease-out
              hover:scale-110 hover:shadow-xl hover:shadow-blue-500/40 dark:hover:shadow-blue-400/30
              hover:-translate-y-0.5">
              <Wifi className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 dark:bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden animate-in slide-in-from-left duration-300">
                <h1 className="text-base font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-violet-900
                  dark:from-gray-50 dark:via-blue-100 dark:to-violet-100
                  bg-clip-text text-transparent tracking-tight">
                  ISP Admin
                </h1>
                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 tracking-wide">Clients Management System</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation - Premium menu items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300/60 dark:scrollbar-thumb-gray-600/60 scrollbar-track-transparent" role="menubar">
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
                    group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                    border border-transparent
                    transition-all duration-200 ease-out
                    ${active && !hasSubmenu
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-500 dark:to-violet-500 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-400/20 border-blue-500/60 dark:border-blue-400/60 hover:from-blue-700 hover:to-violet-700 dark:hover:from-blue-600 dark:hover:to-violet-600'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100/60 dark:hover:bg-gray-800/50 hover:border-gray-300/60 dark:hover:border-gray-600/60 hover:shadow-md hover:shadow-gray-500/10 dark:hover:shadow-gray-400/10 hover:-translate-y-0.5'
                    }
                  `}
                  role="menuitem"
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Active indicator - left accent bar */}
                  {active && !hasSubmenu && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/80 dark:bg-white/60 rounded-r-full" />
                  )}
                  
                  <Icon className={`w-5 h-5 shrink-0 transition-all duration-200 ease-out ${
                    active && !hasSubmenu 
                      ? 'scale-110 drop-shadow-sm' 
                      : 'group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`} />

                  {sidebarOpen && (
                    <>
                      <span className="font-semibold flex-1 text-xs tracking-wide">{item.label}</span>
                      {hasSubmenu && (
                        <div className={`transition-all duration-200 ease-out ${isPackagesExpanded ? 'rotate-0' : '-rotate-90'}`}>
                          <ChevronDown className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                        </div>
                      )}
                    </>
                  )}
                </Link>

                {/* Submenu items - Premium accordion */}
                {hasSubmenu && isPackagesExpanded && sidebarOpen && (
                  <div className="ml-4 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200" role="menu">
                    {item.submenu!.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = isActive(subItem.href)
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`
                            group relative flex items-center gap-2.5 px-3 py-2 rounded-lg
                            border border-transparent
                            transition-all duration-200 ease-out
                            ${isSubActive
                              ? 'bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/30 dark:to-violet-900/20 text-blue-700 dark:text-blue-300 shadow-md shadow-blue-500/15 dark:shadow-blue-400/10 border-blue-400/60 dark:border-blue-500/60'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 hover:border-gray-300/60 dark:hover:border-gray-600/60 hover:shadow-sm hover:-translate-y-0.5'
                            }
                          `}
                          role="menuitem"
                          aria-current={isSubActive ? 'page' : undefined}
                          onClick={() => isMobile && setSidebarOpen(false)}
                        >
                          {/* Active indicator for submenu */}
                          {isSubActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-br from-blue-500 to-violet-500 dark:from-blue-400 dark:to-violet-400 rounded-r-full" />
                          )}
                          
                          <SubIcon className="w-4 h-4 shrink-0 transition-all duration-200 group-hover:scale-110" />
                          <span className="text-xs font-medium">{subItem.label}</span>
                          {isSubActive && (
                            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />
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

        {/* Footer Section - Premium card-style */}
        <div className="border-t border-gray-200/60 dark:border-gray-700/60 p-3 space-y-2 
          bg-gradient-to-t from-gray-50/60 via-gray-50/40 to-transparent 
          dark:from-gray-900/60 dark:via-gray-900/40 dark:to-transparent
          backdrop-blur-sm">
          {/* Theme Toggle - Premium button */}
          {sidebarOpen && (
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-gray-700 dark:text-gray-300
                border border-gray-200/60 dark:border-gray-700/60
                bg-white/60 dark:bg-gray-800/50
                hover:border-blue-500/60 dark:hover:border-blue-400/60
                hover:bg-blue-50/50 dark:hover:bg-blue-900/20
                hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10
                hover:-translate-y-0.5
                transition-all duration-200 ease-out group
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <div className="relative transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-12">
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                )}
              </div>
              <span className="text-xs font-semibold">
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </button>
          )}

          {/* User Profile - Premium card */}
          {userLoading ? (
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl 
              bg-gradient-to-r from-gray-50/80 to-gray-100/60 dark:from-gray-800/70 dark:to-gray-800/50 
              border border-gray-200/60 dark:border-gray-700/60
              backdrop-blur-sm`}>
              <div className="w-8 h-8 rounded-full bg-gray-200/80 dark:bg-gray-700/80 animate-pulse shrink-0" />
              {sidebarOpen && (
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-3 w-24 bg-gray-200/80 dark:bg-gray-700/80 rounded animate-pulse" />
                  <div className="h-2.5 w-32 bg-gray-200/80 dark:bg-gray-700/80 rounded animate-pulse" />
                </div>
              )}
            </div>
          ) : user ? (
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl 
              bg-gradient-to-r from-blue-50/60 via-violet-50/50 to-purple-50/60 
              dark:from-blue-900/20 dark:via-violet-900/15 dark:to-purple-900/20
              border border-gray-200/60 dark:border-gray-700/60
              backdrop-blur-sm shadow-sm shadow-gray-900/5 dark:shadow-black/10`}>
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-brr from-blue-500 via-violet-500 to-purple-600 
                flex items-center justify-center text-xs font-bold text-white 
                shrink-0 shadow-md shadow-blue-500/30 dark:shadow-blue-400/20
                hover:shadow-lg hover:shadow-blue-500/40 dark:hover:shadow-blue-400/30
                transition-all duration-200 ease-out hover:scale-110">
                {getUserInitials(user.name)}
                <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-50 truncate">{user.name}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r ${getRoleBadgeColor(user.role)} text-white shadow-sm`}>
                      {user.role.replace('_', ' ').slice(0, 3)}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl 
              bg-gradient-to-r from-red-50/60 to-red-100/50 dark:from-red-900/20 dark:to-red-900/15
              border border-red-200/60 dark:border-red-700/60
              backdrop-blur-sm`}>
              <User className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 truncate">Not logged in</p>
                  <p className="text-[10px] font-medium text-red-600/80 dark:text-red-400/80 truncate">Please sign in</p>
                </div>
              )}
            </div>
          )}

          {/* Logout Button - Premium styling */}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-gray-700 dark:text-gray-300
              border border-gray-200/60 dark:border-gray-700/60
              bg-white/60 dark:bg-gray-800/50
              hover:border-red-500/60 dark:hover:border-red-400/60
              hover:bg-red-50/50 dark:hover:bg-red-900/20
              hover:text-red-700 dark:hover:text-red-400
              hover:shadow-lg hover:shadow-red-500/10 dark:hover:shadow-red-400/10
              hover:-translate-y-0.5
              transition-all duration-200 ease-out group
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50
            `}
            aria-label="Logout"
          >
            <LogOut className={`w-5 h-5 transition-all duration-200 ease-out
              group-hover:scale-110 group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-400`} />
            {sidebarOpen && <span className="text-xs font-semibold">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
