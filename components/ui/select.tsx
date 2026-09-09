'use client'

import { useId, useMemo } from 'react'
import ReactSelect, {
  type ClassNamesConfig,
  type Props as ReactSelectProps,
  type GroupBase,
} from 'react-select'
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

  const classNames = useMemo<ClassNamesConfig<SelectOption, false, GroupBase<SelectOption>>>(() => {
    const controlBase =
      'min-h-[40px] rounded-md border shadow-sm transition-all focus-within:outline-none'
    const controlBorder = error
      ? 'border-red-300 dark:border-red-700'
      : 'border-input'
    const controlBg = 'bg-card'
    const controlText = 'text-foreground'
    const controlFocus = error
      ? 'ring-1 ring-red-500'
      : 'ring-1 ring-ring'

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
      placeholder: () => 'text-muted-foreground',
      singleValue: () => 'text-foreground',
      input: () => 'text-foreground',
      indicatorsContainer: () => 'pr-2',
      indicatorSeparator: () => 'bg-border',
      dropdownIndicator: () => 'text-muted-foreground',
      clearIndicator: () => 'text-muted-foreground',
      menu: () =>
        'mt-1 rounded-md border border-border bg-popover shadow-lg',
      menuList: () => 'p-1',
      option: (state: { isFocused: boolean; isSelected: boolean }) =>
        [
          'rounded-md px-3 py-2 text-sm',
          state.isSelected
            ? 'bg-accent text-accent-foreground'
            : state.isFocused
              ? 'bg-accent/60 text-accent-foreground'
              : 'text-popover-foreground',
        ].join(' '),
      noOptionsMessage: () => 'px-3 py-2 text-sm text-muted-foreground',
    }
  }, [error])

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-foreground">
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
        classNames={classNames}
        styles={{
          // Prevent react-select inline defaults from adding transparency
          control: (base) => ({ ...base, backgroundColor: 'transparent' }),
        }}
        theme={(theme) => ({
          ...theme,
          colors: {
            ...theme.colors,
            neutral0: isDark ? '#10231e' : '#fffdf8',
            neutral5: isDark ? '#173029' : '#f7f5ef',
            neutral10: isDark ? '#18352e' : '#eeeae0',
            neutral20: isDark ? '#39534b' : '#d4cdbd',
            neutral30: isDark ? '#526b63' : '#aca493',
            neutral40: isDark ? '#8b9c95' : '#718078',
            neutral50: isDark ? '#aeb9b3' : '#5b6962',
            neutral60: isDark ? '#c8d0cc' : '#425149',
            neutral70: isDark ? '#dce1de' : '#2c3b34',
            neutral80: isDark ? '#f4f1e8' : '#14201b',
            neutral90: isDark ? '#fffdf8' : '#0c1613',
            primary: '#b48a4a',
            primary25: isDark ? '#18352e' : '#eee9dd',
            primary50: isDark ? '#22483e' : '#e8e2d6',
            primary75: isDark ? '#2d5a4e' : '#d9d3c5',
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
        <p id={`${inputId}-helper`} className="mt-1 text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  )
}
