import React from 'react';
import { Tooltip } from '../common/Tooltip';

export type MetricVariant = 'default' | 'profit' | 'loss' | 'warning';

export interface MetricsCardProps {
  /** Metric category or title */
  label: string;
  /** Primary metric display value */
  value: string;
  /** Optional secondary context or unit text */
  sublabel?: string;
  /** Visual emphasis color variant */
  variant?: MetricVariant;
  /** Optional explanatory tooltip text */
  tooltip?: string;
  /** Optional additional container CSS classes */
  className?: string;
}

/**
 * Metric display card presenting numeric results with semantic profit,
 * loss, or warning styling and contextual tooltips.
 */
export function MetricsCard({
  label,
  value,
  sublabel,
  variant = 'default',
  tooltip,
  className = '',
}: MetricsCardProps): React.JSX.Element {
  const valueColorClass = {
    default: 'text-slate-100',
    profit: 'text-emerald-400',
    loss: 'text-rose-400',
    warning: 'text-amber-400',
  }[variant];

  return (
    <div className={`bg-slate-800 rounded-lg p-3 border border-slate-700 ${className}`}>
      {/* Label & Tooltip Row */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-slate-400 uppercase tracking-wider truncate font-medium">
          {label}
        </span>
        {tooltip && (
          <Tooltip content={tooltip}>
            <span className="text-slate-500 hover:text-slate-300 cursor-help text-xs">ℹ</span>
          </Tooltip>
        )}
      </div>

      {/* Main Metric Value */}
      <div className={`text-lg font-semibold mt-1 font-mono tracking-tight ${valueColorClass}`}>
        {value}
      </div>

      {/* Optional Sublabel */}
      {sublabel && (
        <div className="text-xs text-slate-400 mt-1 truncate">
          {sublabel}
        </div>
      )}
    </div>
  );
}
