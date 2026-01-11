import Link from 'next/link'
import { BarChart3, PieChart, Shield, LineChart, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ReportsHome({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reports Overview</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Leadership and operational reporting for <span className="font-medium">{orgName}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Link href={`/app/org/${orgSlug}/reports/delinquency-aging`} className="block">
          <Card className="h-full transition-all hover:shadow-md cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-base">Overdue Analysis</CardTitle>
              </div>
              <CardDescription className="mt-1">
                See unpaid amounts grouped by how long they&apos;ve been overdue (0–7, 8–15, 16–30, 31+ days).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" size="sm" className="w-full">
                View report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/app/org/${orgSlug}/reports/collection-rate`} className="block">
          <Card className="h-full transition-all hover:shadow-md cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-base">Collection Rate</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Measure rent collected vs. due across a selected date range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" size="sm" className="w-full">
                View report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/app/org/${orgSlug}/reports/building-rollups`} className="block">
          <Card className="h-full transition-all hover:shadow-md cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-base">Building Rollups</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Compare unpaid totals and overdue counts by building to spot risk quickly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" size="sm" className="w-full">
                View report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/app/org/${orgSlug}/reports/audit-trail`} className="block">
          <Card className="h-full transition-all hover:shadow-md cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-base">Audit Trail</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Review sensitive actions (payments, currency changes, status updates) for accountability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" size="sm" className="w-full">
                View audit trail
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="text-base">Operational Views</CardTitle>
            <CardDescription className="mt-1">
              Quick access to actionable views for managing rent payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href={`/app/org/${orgSlug}/follow-ups`} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full">
                Follow-up Queue
              </Button>
            </Link>
            <Link href={`/app/org/${orgSlug}/buildings-unpaid`} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full">
                Unpaid by Building
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


