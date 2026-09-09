'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useId, useRef, useState, useTransition } from 'react'
import { signOut } from '@/app/actions/auth'
import {
  ChevronDown,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EstateIQLogo } from '@/components/brand/estate-iq-logo'
import { useThemeControl } from '@/components/ui/use-theme-control'

interface AppLayoutProps {
  orgSlug: string
  orgName: string
  currentPath?: string
  userRole?: string
  children: ReactNode
}

type NavItem = {
  href: string
  label: string
}

type NavEntry =
  | { type: 'item'; item: NavItem }
  | { type: 'group'; label: string; items: NavItem[] }

const navigationEntries: NavEntry[] = [
  { type: 'item', item: { href: '', label: 'Dashboard' } },
  {
    type: 'group',
    label: 'Portfolio',
    items: [
      { href: 'buildings', label: 'Buildings' },
      { href: 'units', label: 'Units' },
      { href: 'tenants', label: 'Tenants' },
      { href: 'occupancies', label: 'Occupancies' },
    ],
  },
  { type: 'item', item: { href: 'maintenance', label: 'Maintenance' } },
  {
    type: 'group',
    label: 'Rent operations',
    items: [
      { href: 'rent-configs', label: 'Rent schedules' },
      { href: 'rent-periods', label: 'Rent periods' },
      { href: 'payments', label: 'Payments' },
      { href: 'follow-ups', label: 'Follow-up queue' },
      { href: 'reminders', label: 'Reminder history' },
      { href: 'buildings-unpaid', label: 'Unpaid by building' },
    ],
  },
  {
    type: 'group',
    label: 'Insights',
    items: [
      { href: 'reports', label: 'Reports overview' },
      { href: 'reports/delinquency-aging', label: 'Overdue analysis' },
      { href: 'reports/collection-rate', label: 'Collection rate' },
      { href: 'reports/building-rollups', label: 'Building rollups' },
      { href: 'reports/audit-trail', label: 'Audit trail' },
    ],
  },
]

const defaultOpenGroups = ['Portfolio', 'Rent operations']
const navigationPreferenceKey = 'estateiq:sidebar-open-groups'
const settingsNavItem = { href: 'settings', label: 'Settings' }
const validGroupLabels = navigationEntries.flatMap((entry) =>
  entry.type === 'group' ? [entry.label] : []
)

function isNavItemActive(href: string, currentPath?: string) {
  if (href === '') return !currentPath
  if (href === 'reports') return currentPath === href
  return currentPath === href || Boolean(currentPath?.startsWith(`${href}/`))
}

function getActiveGroupLabel(currentPath?: string) {
  for (const entry of navigationEntries) {
    if (entry.type === 'group' && entry.items.some((item) => isNavItemActive(item.href, currentPath))) {
      return entry.label
    }
  }

  return undefined
}

function withActiveGroup(groups: string[], currentPath?: string) {
  const activeGroup = getActiveGroupLabel(currentPath)
  return activeGroup && !groups.includes(activeGroup) ? [...groups, activeGroup] : groups
}

function NavigationLink({
  item,
  orgSlug,
  currentPath,
  onNavigate,
}: {
  item: NavItem
  orgSlug: string
  currentPath?: string
  onNavigate?: () => void
}) {
  const active = isNavItemActive(item.href, currentPath)
  const href = item.href ? `/app/org/${orgSlug}/${item.href}` : `/app/org/${orgSlug}`

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-10 items-center border-l-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar ${
        active
          ? 'border-brand-brass bg-sidebar-accent text-sidebar-accent-foreground'
          : 'border-transparent text-muted-foreground hover:border-sidebar-border hover:text-sidebar-accent-foreground'
      }`}
    >
      {item.label}
    </Link>
  )
}

function AccountAccess({ userRole }: { userRole?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">Account access</p>
      <p className="text-sm capitalize">{userRole?.toLowerCase() ?? 'member'}</p>
    </div>
  )
}

function Navigation({
  orgSlug,
  currentPath,
  openGroups,
  onToggleGroup,
  onNavigate,
}: {
  orgSlug: string
  currentPath?: string
  openGroups: string[]
  onToggleGroup: (label: string) => void
  onNavigate?: () => void
}) {
  const navigationId = useId().replaceAll(':', '')

  return (
    <nav aria-label="Primary navigation" className="space-y-2">
      {navigationEntries.map((entry) => {
        if (entry.type === 'item') {
          return (
            <NavigationLink
              key={entry.item.href}
              item={entry.item}
              orgSlug={orgSlug}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />
          )
        }

        const open = openGroups.includes(entry.label)
        const containsActivePage = entry.items.some((item) => isNavItemActive(item.href, currentPath))
        const contentId = `${navigationId}-${entry.label.toLowerCase().replaceAll(' ', '-')}`

        return (
          <div key={entry.label}>
            <button
              type="button"
              onClick={() => onToggleGroup(entry.label)}
              aria-expanded={open}
              aria-controls={contentId}
              className={`flex min-h-10 w-full items-center justify-between border-l-2 px-3 py-2 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar ${
                containsActivePage && !open
                  ? 'border-brand-brass bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              }`}
            >
              <span>{entry.label}</span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              id={contentId}
              aria-hidden={!open}
              inert={!open}
              className={`grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none ${
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-1 py-1 pl-2">
                  {entry.items.map((item) => (
                    <NavigationLink
                      key={item.href}
                      item={item}
                      orgSlug={orgSlug}
                      currentPath={currentPath}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}

export function AppLayout({ orgSlug, orgName, currentPath, userRole, children }: AppLayoutProps) {
  const { themeLabel, themePressed, toggleTheme } = useThemeControl()
  const initialPathRef = useRef(currentPath)
  const [openGroups, setOpenGroups] = useState(() => withActiveGroup(defaultOpenGroups, currentPath))
  const [navigationPreferencesLoaded, setNavigationPreferencesLoaded] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [isPending, startTransition] = useTransition()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const mobileNavRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let storedGroups: string[] = []
    let hasStoredPreference = false

    try {
      const storedValue = window.localStorage.getItem(navigationPreferenceKey)
      const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : null
      if (Array.isArray(parsedValue)) {
        hasStoredPreference = true
        storedGroups = Array.from(
          new Set(
            parsedValue.filter(
              (group): group is string =>
                typeof group === 'string' && validGroupLabels.includes(group)
            )
          )
        )
      }
    } catch {
      storedGroups = []
    }

    const preferredGroups = hasStoredPreference ? storedGroups : defaultOpenGroups
    setOpenGroups(withActiveGroup(preferredGroups, initialPathRef.current))
    setNavigationPreferencesLoaded(true)
  }, [])

  useEffect(() => {
    if (!navigationPreferencesLoaded) return

    try {
      window.localStorage.setItem(navigationPreferenceKey, JSON.stringify(openGroups))
    } catch {
      // Navigation remains usable when browser storage is unavailable.
    }
  }, [navigationPreferencesLoaded, openGroups])

  useEffect(() => {
    if (!mobileNavOpen) return

    const previousOverflow = document.body.style.overflow
    const menuButton = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !mobileNavRef.current) return

      const focusable = Array.from(
        mobileNavRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleTab)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)
      menuButton?.focus()
    }
  }, [mobileNavOpen])

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  const toggleNavigationGroup = (label: string) => {
    setOpenGroups((groups) =>
      groups.includes(label) ? groups.filter((group) => group !== label) : [...groups, label]
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
          <div className="border-b border-sidebar-border px-5 py-5">
            <Link
              href={`/app/org/${orgSlug}`}
              className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <EstateIQLogo compact />
            </Link>
            <p className="mt-3 truncate text-xs text-muted-foreground">{orgName}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <Navigation
              orgSlug={orgSlug}
              currentPath={currentPath}
              openGroups={openGroups}
              onToggleGroup={toggleNavigationGroup}
            />
          </div>
          <div className="border-t border-sidebar-border p-3">
            <div className="mb-2 flex items-center justify-between rounded-lg px-3 py-2">
              <AccountAccess userRole={userRole} />
              <button
                type="button"
                onClick={toggleTheme}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                aria-label={themeLabel}
                aria-pressed={themePressed}
              >
                <Sun className="absolute h-4 w-4 scale-100 dark:scale-0" />
                <Moon className="absolute h-4 w-4 scale-0 dark:scale-100" />
              </button>
            </div>
            {userRole === 'OWNER' && (
              <NavigationLink
                item={settingsNavItem}
                orgSlug={orgSlug}
                currentPath={currentPath}
              />
            )}
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={() => setShowSignOutDialog(true)}
              className="w-full justify-start no-underline hover:no-underline"
            >
              Sign out
            </Button>
          </div>
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open navigation"
                  aria-expanded={mobileNavOpen}
                  aria-controls="mobile-navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <EstateIQLogo compact />
                  <p className="truncate text-xs text-muted-foreground">{orgName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={themeLabel}
                aria-pressed={themePressed}
              >
                <Sun className="absolute h-5 w-5 scale-100 dark:scale-0" />
                <Moon className="absolute h-5 w-5 scale-0 dark:scale-100" />
              </button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">{children}</main>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#07100d]/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside
            ref={mobileNavRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-left"
          >
            <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4">
              <div>
                <EstateIQLogo compact />
                <p className="mt-0.5 max-w-56 truncate text-xs text-muted-foreground">{orgName}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <Navigation
                orgSlug={orgSlug}
                currentPath={currentPath}
                openGroups={openGroups}
                onToggleGroup={toggleNavigationGroup}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
            <div className="border-t border-sidebar-border p-4">
              <div className="mb-3 px-3">
                <AccountAccess userRole={userRole} />
              </div>
              {userRole === 'OWNER' && (
                <div className="mb-2">
                  <NavigationLink
                    item={settingsNavItem}
                    orgSlug={orgSlug}
                    currentPath={currentPath}
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => {
                  setMobileNavOpen(false)
                  setShowSignOutDialog(true)
                }}
              >
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={showSignOutDialog}
        onClose={() => setShowSignOutDialog(false)}
        onConfirm={handleSignOut}
        title="Sign out"
        description="Are you sure you want to sign out? You'll need to sign in again to access your account."
        confirmText="Sign out"
        cancelText="Cancel"
        variant="default"
        loading={isPending}
      />
    </>
  )
}
