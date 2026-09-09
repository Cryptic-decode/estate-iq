import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  guidance?: string
  action?: ReactNode
}

export function EmptyState({ title, description, guidance, action }: EmptyStateProps) {
  return (
    <div className="border-y border-border py-8 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {guidance && <p className="mt-3 text-xs text-muted-foreground">{guidance}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
