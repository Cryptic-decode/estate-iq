import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  meta?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-brass">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
        {meta && <p className="mt-2 text-xs text-muted-foreground">{meta}</p>}
      </div>
      {actions && <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div>}
    </header>
  )
}
