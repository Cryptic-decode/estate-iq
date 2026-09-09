import { EstateIQLogo } from '@/components/brand/estate-iq-logo'
import { Skeleton } from '@/components/ui/skeleton'

export function AppRouteSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground" aria-label="Loading workspace" role="status">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar px-5 py-5 lg:block">
        <EstateIQLogo compact />
        <Skeleton className="mt-4 h-3 w-32" />
        <div className="mt-10 space-y-7">
          {[3, 4, 2].map((count, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <Skeleton className="h-2.5 w-20" />
              {Array.from({ length: count }).map((_, itemIndex) => (
                <Skeleton key={itemIndex} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-16 items-center border-b border-border bg-background/90 px-4 lg:hidden">
          <EstateIQLogo compact />
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 outline-none sm:px-6 sm:py-8 xl:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-64 max-w-full" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-3 h-3 w-24" />
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-3 h-4 w-72 max-w-full" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <span className="sr-only">Loading EstateIQ workspace</span>
        </main>
      </div>
    </div>
  )
}
