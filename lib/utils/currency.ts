/**
 * Currency formatting utility
 * Formats amounts based on currency code (ISO 4217)
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  ZAR: 'R',
}

/**
 * Format currency amount based on currency code
 * @param amount - The amount to format
 * @param currencyCode - ISO 4217 currency code (e.g., 'NGN', 'USD')
 * @returns Formatted currency string (e.g., '₦1,000.00' or '$1,000.00')
 */
export function formatCurrency(amount: number, currencyCode: string = 'NGN'): string {
  // Get currency symbol
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode

  // For NGN, use Nigerian locale formatting
  if (currencyCode === 'NGN') {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // For other currencies, use standard formatting
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback if currency code is invalid
    return `${symbol}${amount.toFixed(2)}`
  }
}

/**
 * Get currency symbol for a currency code
 * @param currencyCode - ISO 4217 currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currencyCode: string = 'NGN'): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode
}

/**
 * Common currency options for dropdowns
 */
export const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'Nigerian Naira (₦)', symbol: '₦' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
  { value: 'CHF', label: 'Swiss Franc (CHF)', symbol: 'CHF' },
  { value: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥' },
  { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { value: 'ZAR', label: 'South African Rand (R)', symbol: 'R' },
] as const

