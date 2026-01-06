import Link from 'next/link'
import { ReactNode } from 'react'
import { signOut } from '@/app/actions/auth'
import { Building2, Home, Users, FileText, DollarSign, Calendar, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppLayoutProps {
  orgSlug: string
  orgName: string
  currentPath?: string
  userRole?: string
  children: ReactNode
}

const navItems = [
  { href: 'buildings', label: 'Buildings', icon: Building2 },
  { href: 'units', label: 'Units', icon: Home },
  { href: 'tenants', label: 'Tenants', icon: Users },
  { href: 'occupancies', label: 'Occupancies', icon: FileText },
  { href: 'rent-configs', label: 'Rent Configs', icon: DollarSign },
  { href: 'rent-periods', label: 'Rent Periods', icon: Calendar },
]

export function AppLayout({ orgSlug, orgName, currentPath, userRole, children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/app/org/${orgSlug}`}
              className="text-lg font-semibold text-zinc-900 transition-colors hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-200"
            >
              EstateIQ
            </Link>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{orgName}</span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const href = `/app/org/${orgSlug}/${item.href}`
              const isActive = currentPath === item.href || currentPath === href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            {userRole === 'OWNER' && (
              <Link
                href={`/app/org/${orgSlug}/settings`}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  currentPath === 'settings'
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            )}
            <form action={signOut}>
              <Button
                type="submit"
                variant="tertiary"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}

