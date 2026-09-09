import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { PageHeader } from '@/components/app/page-header'

const reports = [
  {
    href: 'delinquency-aging',
    title: 'Overdue analysis',
    description: 'See unpaid amounts grouped into 0–7, 8–15, 16–30, and 31+ day ranges.',
  },
  {
    href: 'collection-rate',
    title: 'Collection rate',
    description: 'Measure rent collected against rent due across a selected date range.',
  },
  {
    href: 'building-rollups',
    title: 'Building rollups',
    description: 'Compare unpaid totals and overdue counts by building.',
  },
  {
    href: 'audit-trail',
    title: 'Audit trail',
    description: 'Review sensitive payment, currency, and status changes.',
  },
]

export function ReportsHome({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <PageHeader eyebrow="Insights" title="Reports overview" description={`Leadership and operational reporting for ${orgName}.`} />

      <div className="mt-8 grid border-y border-border lg:grid-cols-2">
        {reports.map((report, index) => (
          <Link
            key={report.href}
            href={`/app/org/${orgSlug}/reports/${report.href}`}
            className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-border px-2 py-6 transition-colors hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring last:border-b-0 lg:[&:nth-child(even)]:border-l lg:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <span className="font-estate-serif text-lg text-brand-brass">0{index + 1}</span>
            <span>
              <span className="block font-estate-serif text-2xl text-foreground">{report.title}</span>
              <span className="mt-2 block max-w-md text-sm leading-6 text-muted-foreground">{report.description}</span>
            </span>
          </Link>
        ))}
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
            <ButtonLink href={`/app/org/${orgSlug}/follow-ups`} variant="secondary" size="md" fullWidth className="sm:w-auto">
              Follow-up queue
            </ButtonLink>
            <ButtonLink href={`/app/org/${orgSlug}/buildings-unpaid`} variant="secondary" size="md" fullWidth className="sm:w-auto">
              Unpaid by building
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
