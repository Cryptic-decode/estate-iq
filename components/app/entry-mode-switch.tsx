'use client'

import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type EntryMode = 'individual' | 'bulk'

export function EntryModeSwitch({
  value,
  onChange,
  disabled = false,
}: {
  value: EntryMode
  onChange: (value: EntryMode) => void
  disabled?: boolean
}) {
  return (
    <div
      className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950/50"
      role="group"
      aria-label="Choose entry method"
    >
      <Button type="button" variant={value === 'individual' ? 'primary' : 'tertiary'} size="sm" onClick={() => onChange('individual')} disabled={disabled} aria-pressed={value === 'individual'} fullWidth>
        <Plus className="mr-2 h-4 w-4" />
        Single entry
      </Button>
      <Button type="button" variant={value === 'bulk' ? 'primary' : 'tertiary'} size="sm" onClick={() => onChange('bulk')} disabled={disabled} aria-pressed={value === 'bulk'} fullWidth>
        <Upload className="mr-2 h-4 w-4" />
        Bulk upload
      </Button>
    </div>
  )
}
