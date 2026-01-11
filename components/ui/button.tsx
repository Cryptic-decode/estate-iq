import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Spinner } from './spinner'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      className = '',
      disabled,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed'

    const variants = {
      primary:
        'bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-500 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100',
      secondary:
        'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus:ring-zinc-500 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800',
      tertiary:
        'text-zinc-900 hover:text-zinc-700 hover:underline focus:ring-zinc-500 dark:text-zinc-50 dark:hover:text-zinc-200',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    const widthClass = fullWidth ? 'w-full' : ''
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Spinner size={size === 'sm' ? 'sm' : 'md'} />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

