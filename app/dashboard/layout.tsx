import ResponsiveSidebar from '@/components/ResponsiveSidebar'

  export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
        <ResponsiveSidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    )
  }