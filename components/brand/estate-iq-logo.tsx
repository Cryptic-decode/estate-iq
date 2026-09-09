import type { HTMLAttributes } from 'react'

type EstateIQLogoProps = HTMLAttributes<HTMLSpanElement> & {
  markOnly?: boolean
  compact?: boolean
}

export function EstateIQLogo({ markOnly = false, compact = false, className = '', ...props }: EstateIQLogoProps) {
  return (
    <span
      className={`inline-flex items-center ${compact ? 'gap-2' : 'gap-2.5'} text-[#123a32] dark:text-[#f4f1e8] ${className}`}
      {...props}
    >
      <svg
        viewBox="0 0 36 36"
        aria-hidden="true"
        className={compact ? 'h-7 w-7 shrink-0' : 'h-8 w-8 shrink-0'}
        fill="none"
      >
        <path d="M7.5 31V8.5L18 3.5l10.5 5V31" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 31V11l6-3 6 3v20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 8v19" stroke="currentColor" strokeWidth="2" />
        <path d="M6 31h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="11" r="2.25" fill="#b48a4a" />
      </svg>
      {!markOnly && (
        <span className={`font-estate-serif leading-none tracking-[-0.025em] ${compact ? 'text-xl' : 'text-2xl'}`}>
          Estate<span className="text-[#b48a4a]">IQ</span>
        </span>
      )}
    </span>
  )
}
