'use client'

import { useId, useMemo } from 'react'
import ReactSelect, { type Props as ReactSelectProps, type GroupBase } from 'react-select'
import { useTheme } from 'next-themes'

export type SelectOption = { value: string; label: string }

export interface SelectProps
  extends Omit<
    ReactSelectProps<SelectOption, false, GroupBase<SelectOption>>,
    'value' | 'onChange' | 'options'
  > {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  value: SelectOption | null
  onChange: (value: SelectOption | null) => void
}

export function Select({ label, error, helperText, options, value, onChange, id, ...props }: SelectProps) {
  const reactId = useId()
  const inputId = id || `select-${reactId}`
  const { resolvedTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

  const classNames = useMemo(() => {
    const controlBase =
      'min-h-[40px] rounded-md border shadow-sm transition-all focus-within:outline-none'
    const controlBorder = error
      ? 'border-red-300 dark:border-red-700'
      : 'border-zinc-300 dark:border-zinc-700'
    const controlBg = 'bg-white dark:bg-zinc-900/50'
    const controlText = 'text-zinc-900 dark:text-zinc-50'
    const controlFocus = error
      ? 'ring-1 ring-red-500'
      : 'ring-1 ring-zinc-500'

    return {
      container: () => 'mt-1',
      control: (state: { isFocused: boolean; isDisabled: boolean }) =>
        [
          controlBase,
          controlBorder,
          controlBg,
          controlText,
          state.isFocused ? controlFocus : '',
          state.isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' '),
      valueContainer: () => 'px-3 py-1',
      placeholder: () => 'text-zinc-500 dark:text-zinc-400',
      singleValue: () => 'text-zinc-900 dark:text-zinc-50',
      input: () => 'text-zinc-900 dark:text-zinc-50',
      indicatorsContainer: () => 'pr-2',
      indicatorSeparator: () => 'bg-zinc-200 dark:bg-zinc-700',
      dropdownIndicator: () => 'text-zinc-500 dark:text-zinc-400',
      clearIndicator: () => 'text-zinc-500 dark:text-zinc-400',
      menu: () =>
        'mt-1 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900',
      menuList: () => 'p-1',
      option: (state: { isFocused: boolean; isSelected: boolean }) =>
        [
          'rounded-md px-3 py-2 text-sm',
          state.isSelected
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
            : state.isFocused
              ? 'bg-zinc-50 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-50'
              : 'text-zinc-700 dark:text-zinc-200',
        ].join(' '),
      noOptionsMessage: () => 'px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400',
    }
  }, [error])

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <ReactSelect
        inputId={inputId}
        instanceId={inputId}
        options={options}
        value={value}
        onChange={(v) => onChange((v as SelectOption) ?? null)}
        isSearchable
        classNames={classNames as any}
        styles={{
          // Prevent react-select inline defaults from adding transparency
          control: (base) => ({ ...base, backgroundColor: 'transparent' }),
        }}
        theme={(theme) => ({
          ...theme,
          colors: {
            ...theme.colors,
            neutral0: isDark ? '#18181b' : '#ffffff',
            neutral5: isDark ? '#27272a' : '#f4f4f5',
            neutral10: isDark ? '#27272a' : '#f4f4f5',
            neutral20: isDark ? '#3f3f46' : '#d4d4d8',
            neutral30: isDark ? '#52525b' : '#a1a1aa',
            neutral40: isDark ? '#a1a1aa' : '#71717a',
            neutral50: isDark ? '#a1a1aa' : '#71717a',
            neutral60: isDark ? '#d4d4d8' : '#52525b',
            neutral70: isDark ? '#e4e4e7' : '#3f3f46',
            neutral80: isDark ? '#f4f4f5' : '#27272a',
            neutral90: isDark ? '#fafafa' : '#18181b',
            primary: isDark ? '#e4e4e7' : '#27272a',
            primary25: isDark ? '#27272a' : '#fafafa',
            primary50: isDark ? '#3f3f46' : '#f4f4f5',
            primary75: isDark ? '#52525b' : '#e4e4e7',
          },
        })}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {helperText}
        </p>
      )}
    </div>
  )
}


