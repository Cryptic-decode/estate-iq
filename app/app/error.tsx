'use client'

import { AlertCircle } from 'lucide-react'
import { EstateIQLogo } from '@/components/brand/estate-iq-logo'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground outline-none">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <EstateIQLogo />
        </div>
        <Card className="rounded-2xl p-0 shadow-xl shadow-[#123a32]/8 dark:shadow-black/20">
          <CardHeader className="border-b border-border p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>We couldn&apos;t load this workspace</CardTitle>
            <CardDescription className="mt-2 leading-6">
              Your data has not been changed. Try loading the page again, or return to your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-6 sm:flex-row">
            <Button onClick={reset} className="flex-1">
              Try again
            </Button>
            <ButtonLink href="/app" variant="secondary" className="flex-1">
              Return to workspace
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
