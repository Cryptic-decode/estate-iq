import * as XLSX from 'xlsx'

type ExcelTemplateOptions = {
  filename: string
  sheetName: string
  headers: string[]
  examples: Array<Array<string | number>>
  requiredHeaders: string[]
  notes?: string[]
}

export function downloadExcelTemplate({ filename, sheetName, headers, examples, requiredHeaders, notes = [] }: ExcelTemplateOptions) {
  const workbook = XLSX.utils.book_new()
  const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...examples])

  dataSheet['!cols'] = headers.map((header, index) => ({
    wch: Math.max(header.length + 4, ...examples.map((row) => String(row[index] ?? '').length + 2), 14),
  }))
  dataSheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` }

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['How to use this sample'],
    ['1. Keep the column names exactly as provided.'],
    ['2. Replace the example rows with your own records.'],
    ['3. Do not add extra columns or upload more than 2,000 rows.'],
    ['4. Save the completed workbook as an .xlsx file.'],
    [],
    ['Required columns', requiredHeaders.join(', ')],
    ['All columns', headers.join(', ')],
    ...notes.map((note) => ['Note', note]),
  ])
  instructionsSheet['!cols'] = [{ wch: 22 }, { wch: 90 }]

  XLSX.utils.book_append_sheet(workbook, dataSheet, sheetName)
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')
  XLSX.writeFile(workbook, filename)
}
