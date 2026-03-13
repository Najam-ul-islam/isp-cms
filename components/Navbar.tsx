'use client'

  import { useRouter } from 'next/navigation'

  export default function Navbar() {
    const router = useRouter()

    const handleLogout = () => {
      localStorage.removeItem('token')
      // Also clear the token from cookies
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      router.push('/login')
      router.refresh()
    }

    return (
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h2 className="text-lg font-medium text-gray-900">ISP Admin Panel</h2>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
    )
  }