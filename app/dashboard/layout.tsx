import ResponsiveSidebar from '@/components/ResponsiveSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <ResponsiveSidebar />
      <main
        className="flex-1 overflow-y-auto"
        role="main"
        aria-label="Dashboard content"
      >
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
