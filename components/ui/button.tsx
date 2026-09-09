import Link from 'next/link'
import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef } from 'react'
import { Spinner } from './spinner'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

function buttonClassNames({
  variant,
  size,
  fullWidth,
  className,
}: {
  variant: ButtonVariant
  size: ButtonSize
  fullWidth: boolean
  className?: string
}) {
  const baseStyles =
    'inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
  const variants = {
    primary:
      'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] motion-reduce:active:scale-100',
    secondary:
      'border border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.98] motion-reduce:active:scale-100',
    tertiary:
      'text-foreground hover:bg-accent hover:text-accent-foreground',
  }
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return `${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className || ''}`
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
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={buttonClassNames({ variant, size, fullWidth, className })}
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

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={buttonClassNames({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </Link>
  )
}
