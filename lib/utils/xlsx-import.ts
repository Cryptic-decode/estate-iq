import 'server-only'

import * as XLSX from 'xlsx'

export type ParsedImportRow = {
  rowNumber: number
  values: Record<string, string>
}

const MAX_IMPORT_ROWS = 2000
const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024

export function normalizeImportLookup(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function buildUniqueLookup<T>(
  items: T[],
  getKey: (item: T) => string,
  getValue: (item: T) => string
) {
  const values = new Map<string, string>()
  const ambiguous = new Set<string>()
  for (const item of items) {
    const key = getKey(item)
    if (values.has(key)) ambiguous.add(key)
    else values.set(key, getValue(item))
  }
  return { values, ambiguous }
}

export async function parseXlsxImport(
  file: File,
  expectedHeaders: readonly string[],
  entityLabel: string
): Promise<{ rows: ParsedImportRow[]; error: string | null }> {
  if (!file || file.size === 0) {
    return { rows: [], error: 'Please upload a non-empty .xlsx file.' }
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return { rows: [], error: `Only .xlsx files are supported for ${entityLabel} import.` }
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { rows: [], error: 'The workbook is too large. Maximum file size is 10 MB.' }
  }

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  } catch {
    return { rows: [], error: 'The workbook could not be read. Download a fresh sample and try again.' }
  }

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return { rows: [], error: 'The workbook has no sheets.' }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  })
  if (matrix.length === 0) return { rows: [], error: 'The sheet is empty.' }

  const headers = (matrix[0] ?? []).map((cell) => String(cell ?? '').trim().toLowerCase())
  const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    return { rows: [], error: `Missing required header(s): ${missingHeaders.join(', ')}` }
  }

  const extraHeaders = headers.filter(
    (header) => header.length > 0 && !expectedHeaders.includes(header)
  )
  if (extraHeaders.length > 0) {
    return { rows: [], error: `Unexpected header(s): ${extraHeaders.join(', ')}` }
  }

  if (matrix.length - 1 > MAX_IMPORT_ROWS) {
    return { rows: [], error: `Too many rows. Maximum allowed is ${MAX_IMPORT_ROWS}.` }
  }

  const rows: ParsedImportRow[] = []
  for (let index = 1; index < matrix.length; index += 1) {
    const source = matrix[index] ?? []
    const values = Object.fromEntries(
      expectedHeaders.map((header) => [header, String(source[headers.indexOf(header)] ?? '').trim()])
    )
    if (!Object.values(values).some(Boolean)) continue
    rows.push({ rowNumber: index + 1, values })
  }

  return rows.length > 0
    ? { rows, error: null }
    : { rows: [], error: 'No data rows found in the uploaded sheet.' }
}
