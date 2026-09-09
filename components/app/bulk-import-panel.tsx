'use client'

import type { ReactNode } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ImportPreview = {
  totalRows: number
  validCount: number
  invalidCount: number
}

type InvalidRow = {
  rowNumber: number
  label: string
  error: string | null
}

export function BulkImportPanel({
  fileInputId,
  instructions,
  file,
  preview,
  invalidRows,
  disabled,
  isValidating,
  isImporting,
  onDownloadSample,
  onFileChange,
  onValidate,
  onImport,
}: {
  fileInputId: string
  instructions: ReactNode
  file: File | null
  preview: ImportPreview | null
  invalidRows: InvalidRow[]
  disabled: boolean
  isValidating: boolean
  isImporting: boolean
  onDownloadSample: () => void
  onFileChange: (file: File | null) => void
  onValidate: () => void
  onImport: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
        {instructions}
      </div>

      <Button variant="secondary" size="sm" onClick={onDownloadSample} disabled={disabled} fullWidth>
        <Download className="mr-2 h-4 w-4" />
        Download sample sheet
      </Button>

      <Input
        id={fileInputId}
        label="Completed Excel file (.xlsx)"
        type="file"
        accept=".xlsx"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        disabled={disabled}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="secondary" size="sm" onClick={onValidate} disabled={!file || disabled} loading={isValidating} fullWidth>
          Validate file
        </Button>
        <Button variant="primary" size="sm" onClick={onImport} disabled={!file || !preview || preview.invalidCount > 0 || disabled} loading={isImporting} fullWidth>
          <Upload className="mr-2 h-4 w-4" />
          Import {preview?.validCount ?? 0} rows
        </Button>
      </div>

      {preview ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <div className="grid grid-cols-3 gap-2 text-center">
            <ImportCount label="Rows" value={preview.totalRows} />
            <ImportCount label="Valid" value={preview.validCount} tone="success" />
            <ImportCount label="Errors" value={preview.invalidCount} tone={preview.invalidCount ? 'danger' : 'default'} />
          </div>
          {invalidRows.length > 0 ? (
            <div className="max-h-48 space-y-2 overflow-y-auto" aria-live="polite">
              {invalidRows.map((row) => (
                <div key={`${row.rowNumber}-${row.label}`} className="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-200">
                  <p className="font-medium">Row {row.rowNumber}: {row.label || 'Unnamed record'}</p>
                  <p className="mt-0.5 text-xs">{row.error}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-emerald-700 dark:text-emerald-300">All rows are ready to import.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function ImportCount({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'danger' }) {
  const toneClass = tone === 'success'
    ? 'text-emerald-700 dark:text-emerald-300'
    : tone === 'danger'
      ? 'text-red-700 dark:text-red-300'
      : 'text-zinc-900 dark:text-zinc-50'

  return (
    <div className="rounded-md bg-zinc-100 px-2 py-2 dark:bg-zinc-900">
      <p className={`text-base font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  )
}
