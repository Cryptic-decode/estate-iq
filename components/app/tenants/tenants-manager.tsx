'use client'

import { useMemo, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileSpreadsheet, Mail, Pencil, Phone, Trash2, Upload, UserCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createTenant,
  deleteTenant,
  importTenantsFromXlsx,
  listTenants,
  updateTenant,
  validateTenantImport,
} from '@/app/actions/tenants'

type Tenant = {
  id: string
  organization_id: string
  full_name: string
  email: string | null
  phone: string | null
  guarantor_full_name: string | null
  guarantor_email: string | null
  guarantor_phone: string | null
  created_at: string
  updated_at: string
}

type TenantImportRowResult = {
  rowNumber: number
  full_name: string
  status: 'valid' | 'invalid'
  error: string | null
}

type TenantImportValidation = {
  rows: TenantImportRowResult[]
  totalRows: number
  validCount: number
  invalidCount: number
}

const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
}

export function TenantsManager({
  orgSlug,
  orgName,
  initialTenants,
}: {
  orgSlug: string
  orgName: string
  initialTenants: Tenant[]
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [guarantorFullName, setGuarantorFullName] = useState('')
  const [guarantorEmail, setGuarantorEmail] = useState('')
  const [guarantorPhone, setGuarantorPhone] = useState('')
  const [entryMode, setEntryMode] = useState<'individual' | 'bulk'>('individual')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importValidation, setImportValidation] = useState<TenantImportValidation | null>(null)
  const [isValidatingImport, setIsValidatingImport] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tenant: Tenant | null }>({
    open: false,
    tenant: null,
  })

  const canSubmit = useMemo(
    () => fullName.trim().length > 0 && !isPending,
    [fullName, isPending]
  )

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setFullName('')
    setEmail('')
    setPhone('')
    setGuarantorFullName('')
    setGuarantorEmail('')
    setGuarantorPhone('')
    setError(null)
  }

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const res = await listTenants(orgSlug)
      setIsLoading(false)
      if (res.error) {
        toast.error(res.error)
        return
      }
      setTenants(res.data ?? [])
    })
  }

  const onSubmit = () => {
    setError(null)
    const trimmedFullName = fullName.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedGuarantorFullName = guarantorFullName.trim()
    const trimmedGuarantorEmail = guarantorEmail.trim()
    const trimmedGuarantorPhone = guarantorPhone.trim()

    if (!trimmedFullName) {
      setError('Full name is required.')
      return
    }

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createTenant(orgSlug, {
          full_name: trimmedFullName,
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
          guarantor_full_name: trimmedGuarantorFullName || undefined,
          guarantor_email: trimmedGuarantorEmail || undefined,
          guarantor_phone: trimmedGuarantorPhone || undefined,
        })
        if (res.error) {
          toast.error(res.error)
          return
        }
        resetForm()
        refresh()
        toast.success(`Tenant "${trimmedFullName}" added!`, {
          description: 'Next: create an occupancy to assign this tenant to a unit.',
        })
        return
      }

      if (!editingId) {
        toast.error('No tenant selected to edit.')
        return
      }

      const res = await updateTenant(orgSlug, editingId, {
        full_name: trimmedFullName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        guarantor_full_name: trimmedGuarantorFullName || undefined,
        guarantor_email: trimmedGuarantorEmail || undefined,
        guarantor_phone: trimmedGuarantorPhone || undefined,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      resetForm()
      refresh()
      toast.success('Tenant updated successfully.')
    })
  }

  const onEdit = (t: Tenant) => {
    setMode('edit')
    setEditingId(t.id)
    setFullName(t.full_name)
    setEmail(t.email ?? '')
    setPhone(t.phone ?? '')
    setGuarantorFullName(t.guarantor_full_name ?? '')
    setGuarantorEmail(t.guarantor_email ?? '')
    setGuarantorPhone(t.guarantor_phone ?? '')
    setError(null)
  }

  const onDelete = (t: Tenant) => {
    setDeleteDialog({ open: true, tenant: t })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.tenant) return

    const t = deleteDialog.tenant
    setError(null)
    setDeleteDialog({ open: false, tenant: null })
    startTransition(async () => {
      const res = await deleteTenant(orgSlug, t.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (editingId === t.id) resetForm()
      refresh()
      toast.success(`Tenant "${t.full_name}" deleted successfully.`)
    })
  }

  const onImportFileChange = (file: File | null) => {
    setImportFile(file)
    setImportValidation(null)
  }

  const onDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new()
    const templateRows = [
      [
        'full_name',
        'email',
        'phone',
        'guarantor_full_name',
        'guarantor_email',
        'guarantor_phone',
      ],
      [
        'Ada Nwosu',
        'ada@example.com',
        '+2348012345678',
        'Ifeanyi Nwosu',
        'ifeanyi@example.com',
        '+2348098765432',
      ],
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(templateRows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tenants')
    XLSX.writeFile(workbook, 'tenants-import-template.xlsx')
  }

  const onValidateImport = () => {
    if (!importFile) {
      toast.error('Select an .xlsx file first.')
      return
    }

    setIsValidatingImport(true)
    startTransition(async () => {
      const res = await validateTenantImport(orgSlug, importFile)
      setIsValidatingImport(false)
      if (res.error || !res.data) {
        toast.error(res.error ?? 'Failed to validate file')
        setImportValidation(null)
        return
      }
      setImportValidation(res.data)
      if (res.data.invalidCount > 0) {
        toast.warning('Validation completed with errors.')
        return
      }
      toast.success('Validation completed. Ready to import.')
    })
  }

  const onRunImport = () => {
    if (!importFile) {
      toast.error('Select an .xlsx file first.')
      return
    }

    setIsImporting(true)
    startTransition(async () => {
      const res = await importTenantsFromXlsx(orgSlug, importFile)
      setIsImporting(false)
      if (res.error) {
        toast.error(res.error)
        if (res.data?.rows) {
          setImportValidation({
            rows: res.data.rows,
            totalRows: res.data.totalRows,
            validCount: res.data.rows.filter((r) => r.status === 'valid').length,
            invalidCount: res.data.rows.filter((r) => r.status === 'invalid').length,
          })
        }
        return
      }
      if (!res.data) {
        toast.error('Import failed.')
        return
      }

      setImportFile(null)
      setImportValidation(null)
      refresh()
      toast.success(`Imported ${res.data.insertedCount} tenant(s) successfully.`)
    })
  }

  const invalidRows = useMemo(
    () => (importValidation?.rows ?? []).filter((row) => row.status === 'invalid'),
    [importValidation]
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tenants
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Manage tenants for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Your tenants</CardTitle>
                <CardDescription className="mt-1">
                  Manage tenant information. Assign tenants to units via occupancies.
                </CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={refresh}
                disabled={isPending || isLoading}
                loading={isLoading}
                className="shrink-0"
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    initial={fadeUp.initial}
                    animate={fadeUp.animate}
                    exit={fadeUp.exit}
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : tenants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <Users className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    No tenants yet
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Create your first tenant to get started.
                  </p>
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Use the form on the right to get started.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {tenants.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start justify-between gap-4 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {t.full_name}
                          </span>
                          {editingId === t.id && mode === 'edit' ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                              editing
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                          {t.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-zinc-400" />
                              <span className="truncate">{t.email}</span>
                            </div>
                          )}
                          {t.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-zinc-400" />
                              <span className="truncate">{t.phone}</span>
                            </div>
                          )}
                          {!t.email && !t.phone && (
                            <span className="text-zinc-400">No contact information</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(t)}
                          disabled={isPending || isLoading}
                          loading={isPending && editingId === t.id}
                          aria-label={`Edit ${t.full_name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(t)}
                          disabled={isPending || isLoading}
                          loading={isPending && deleteDialog.tenant?.id === t.id}
                          aria-label={`Delete ${t.full_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>{mode === 'create' ? 'Add tenants' : 'Edit tenant'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Switch between individual entry and bulk upload.'
                  : 'Update the tenant details. Changes save immediately.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === 'create' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
                    <Button
                      variant={entryMode === 'individual' ? 'primary' : 'tertiary'}
                      size="sm"
                      onClick={() => setEntryMode('individual')}
                      disabled={isPending || isValidatingImport || isImporting}
                      fullWidth
                    >
                      Individual
                    </Button>
                    <Button
                      variant={entryMode === 'bulk' ? 'primary' : 'tertiary'}
                      size="sm"
                      onClick={() => setEntryMode('bulk')}
                      disabled={isPending || isValidatingImport || isImporting}
                      fullWidth
                    >
                      Bulk upload
                    </Button>
                  </div>

                  {entryMode === 'individual' ? (
                    <div className="space-y-4">
                      <Input
                        id="tenant-full-name"
                        label="Full name"
                        placeholder="e.g., John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isPending}
                        required
                      />
                      <Input
                        id="tenant-email"
                        label="Email (optional)"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isPending}
                      />
                      <Input
                        id="tenant-phone"
                        label="Phone (optional)"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isPending}
                      />
                      <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          <UserCheck className="h-4 w-4" />
                          Guarantor details (optional)
                        </p>
                        <div className="space-y-3">
                          <Input
                            id="tenant-guarantor-full-name"
                            label="Guarantor full name"
                            placeholder="e.g., Jane Doe"
                            value={guarantorFullName}
                            onChange={(e) => setGuarantorFullName(e.target.value)}
                            disabled={isPending}
                          />
                          <Input
                            id="tenant-guarantor-email"
                            label="Guarantor email"
                            type="email"
                            placeholder="jane@example.com"
                            value={guarantorEmail}
                            onChange={(e) => setGuarantorEmail(e.target.value)}
                            disabled={isPending}
                          />
                          <Input
                            id="tenant-guarantor-phone"
                            label="Guarantor phone"
                            type="tel"
                            placeholder="+1 (555) 987-6543"
                            value={guarantorPhone}
                            onChange={(e) => setGuarantorPhone(e.target.value)}
                            disabled={isPending}
                          />
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="md"
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        loading={isPending}
                        fullWidth
                      >
                        Create tenant
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Upload a <span className="font-medium">.xlsx</span> file with required headers:
                        <span className="font-medium">
                          {' '}
                          full_name, email, phone, guarantor_full_name, guarantor_email,
                          guarantor_phone
                        </span>
                        .
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={onDownloadTemplate}
                        disabled={isPending || isValidatingImport || isImporting}
                        fullWidth
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download sample sheet
                      </Button>

                      <Input
                        id="tenant-import-file"
                        label="Excel file (.xlsx)"
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => onImportFileChange(e.target.files?.[0] ?? null)}
                        disabled={isPending || isValidatingImport || isImporting}
                      />

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={onValidateImport}
                          disabled={!importFile || isPending || isValidatingImport || isImporting}
                          loading={isValidatingImport}
                          fullWidth
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Validate file
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={onRunImport}
                          disabled={
                            !importFile ||
                            !importValidation ||
                            importValidation.invalidCount > 0 ||
                            isPending ||
                            isValidatingImport ||
                            isImporting
                          }
                          loading={isImporting}
                          fullWidth
                        >
                          Import
                        </Button>
                      </div>

                      {importValidation ? (
                        <div className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                          <div className="text-zinc-700 dark:text-zinc-200">
                            Rows: <span className="font-medium">{importValidation.totalRows}</span> | Valid:{' '}
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {importValidation.validCount}
                            </span>{' '}
                            | Invalid:{' '}
                            <span className="font-medium text-red-600 dark:text-red-400">
                              {importValidation.invalidCount}
                            </span>
                          </div>
                          {invalidRows.length > 0 ? (
                            <div className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-300">
                              {invalidRows.slice(0, 5).map((row) => (
                                <p key={`${row.rowNumber}-${row.full_name}`}>
                                  Row {row.rowNumber}: {row.error}
                                </p>
                              ))}
                              {invalidRows.length > 5 ? (
                                <p>...and {invalidRows.length - 5} more error(s).</p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                              All rows are valid. You can run import now.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    id="tenant-full-name"
                    label="Full name"
                    placeholder="e.g., John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isPending}
                    required
                  />
                  <Input
                    id="tenant-email"
                    label="Email (optional)"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                  />
                  <Input
                    id="tenant-phone"
                    label="Phone (optional)"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isPending}
                  />
                  <Input
                    id="tenant-guarantor-full-name"
                    label="Guarantor full name (optional)"
                    placeholder="e.g., Jane Doe"
                    value={guarantorFullName}
                    onChange={(e) => setGuarantorFullName(e.target.value)}
                    disabled={isPending}
                  />
                  <Input
                    id="tenant-guarantor-email"
                    label="Guarantor email (optional)"
                    type="email"
                    placeholder="jane@example.com"
                    value={guarantorEmail}
                    onChange={(e) => setGuarantorEmail(e.target.value)}
                    disabled={isPending}
                  />
                  <Input
                    id="tenant-guarantor-phone"
                    label="Guarantor phone (optional)"
                    type="tel"
                    placeholder="+1 (555) 987-6543"
                    value={guarantorPhone}
                    onChange={(e) => setGuarantorPhone(e.target.value)}
                    disabled={isPending}
                  />

                  <Button
                    variant="primary"
                    size="md"
                    onClick={onSubmit}
                    disabled={!canSubmit}
                    loading={isPending}
                    fullWidth
                  >
                    Save changes
                  </Button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={resetForm}
                    disabled={isPending}
                    className="w-full"
                  >
                    Cancel editing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, tenant: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete tenant"
        description={
          deleteDialog.tenant
            ? `Delete "${deleteDialog.tenant.full_name}"? This will remove the tenant and may affect linked occupancies.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}

