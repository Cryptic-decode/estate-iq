import { InputHTMLAttributes, forwardRef, useId } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const reactId = useId()
    const inputId = id || `input-${reactId}`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`mt-1 block w-full rounded-md border ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700'
              : 'border-input focus:border-ring focus:ring-ring'
          } bg-card px-3 py-2 text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
