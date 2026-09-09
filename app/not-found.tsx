import { EstateIQLogo } from '@/components/brand/estate-iq-logo'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground outline-none">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <EstateIQLogo />
        </div>
        <Card className="rounded-2xl p-0 text-center shadow-xl shadow-[#123a32]/8 dark:shadow-black/20">
          <CardHeader className="p-6 pb-4">
            <p className="mb-4 font-estate-serif text-4xl text-brand-brass">404</p>
            <CardTitle>Page not found</CardTitle>
            <CardDescription className="mt-2 leading-6">
              This page may have moved, or the address may be incorrect.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <ButtonLink href="/app" fullWidth>
              Return to EstateIQ
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
