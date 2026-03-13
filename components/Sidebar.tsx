'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Package,
  LogOut,
  ChevronRight,
  Wifi,
  Factory
} from 'lucide-react'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()

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
      href: '/dashboard/service-providers',
      label: 'Service Providers',
      icon: Factory
    },
  ]

  return (
    <aside className="w-64 bg-linear-to-b from-gray-900 to-gray-800 text-white min-h-screen flex flex-col shadow-xl border-r border-gray-700/50">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">ISP Admin</h1>
            <p className="text-xs text-gray-400">Control Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <p className="px-3 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
              `}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Section & Logout */}
      <div className="p-4 border-t border-gray-700/50 space-y-2">
        {/* Optional: User Profile Preview */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-700/30">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-xs text-gray-400 truncate">admin@isp.com</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-gray-300 hover:text-white hover:bg-red-500/20 
            hover:shadow-lg hover:shadow-red-500/20
            transition-all duration-200 ease-in-out
            group
          "
        >
          <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}


// 'use client'

//   import { useRouter } from 'next/navigation'
//   import Link from 'next/link'

//   export default function Sidebar() {
//     const router = useRouter()

//     const handleLogout = () => {
//       localStorage.removeItem('token')
//       // Also clear the token from cookies
//       document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
//       router.push('/login')
//       router.refresh()
//     }

//     return (
//       <div className="w-64 bg-gray-800 text-white min-h-screen">
//         <div className="p-4">
//           <h1 className="text-xl font-bold">ISP Admin Panel</h1>
//         </div>
//         <nav className="mt-6">
//           <ul>
//             <li>
//               <Link
//                 href="/dashboard"
//                 className="block py-2 px-4 hover:bg-gray-700 rounded"
//               >
//                 Dashboard
//               </Link>
//             </li>
//             <li>
//               <Link
//                 href="/dashboard/clients"
//                 className="block py-2 px-4 hover:bg-gray-700 rounded"
//               >
//                 Clients
//               </Link>
//             </li>
//             <li>
//               <Link
//                 href="/dashboard/packages"
//                 className="block py-2 px-4 hover:bg-gray-700 rounded"
//               >
//                 Packages
//               </Link>
//             </li>
//             <li>
//               <button
//                 onClick={handleLogout}
//                 className="w-full text-left block py-2 px-4 hover:bg-gray-700 rounded"
//               >
//                 Logout
//               </button>
//             </li>
//           </ul>
//         </nav>
//       </div>
//     )
//   }