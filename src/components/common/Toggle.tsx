import React from 'react';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  color?: string;
}

export interface ToggleProps<T extends string> {
  /** List of selectable toggle options */
  options: ToggleOption<T>[];
  /** Currently selected value */
  value: T;
  /** Callback triggered when user selects an option */
  onChange: (value: T) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the toggle should stretch to full container width */
  fullWidth?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Segmented control toggle component with custom color support
 * and pre-configured themes for LONG/SHORT direction selectors.
 */
export function Toggle<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
}: ToggleProps<T>): React.JSX.Element {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs font-medium',
    md: 'px-3.5 py-1.5 text-sm font-medium',
    lg: 'px-4 py-2 text-base font-medium',
  }[size];

  const getActiveColorClass = (opt: ToggleOption<T>): string => {
    if (opt.color) {
      return opt.color;
    }
    const valUpper = opt.value.toUpperCase();
    if (valUpper === 'LONG') {
      return 'bg-emerald-600 text-white hover:bg-emerald-500 shadow';
    }
    if (valUpper === 'SHORT') {
      return 'bg-rose-600 text-white hover:bg-rose-500 shadow';
    }
    return 'bg-blue-600 text-white hover:bg-blue-500 shadow';
  };

  return (
    <div
      role="group"
      className={`inline-flex items-center p-1 bg-slate-900/80 rounded-lg border border-slate-700 select-none ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const activeColor = getActiveColorClass(opt);
        const inactiveColor =
          'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors';

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md transition-all duration-150 cursor-pointer ${sizeClasses} ${
              fullWidth ? 'flex-1 text-center justify-center' : ''
            } ${isActive ? activeColor : inactiveColor}`}
            aria-pressed={isActive}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
