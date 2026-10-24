import React from 'react';

export interface SliderProps {
  /** Minimum slider value */
  min: number;
  /** Maximum slider value */
  max: number;
  /** Value increment step */
  step: number;
  /** Current value */
  value: number;
  /** Callback fired when value changes */
  onChange: (value: number) => void;
  /** Optional descriptive label */
  label?: string;
  /** Optional custom formatter for displaying values */
  formatValue?: (value: number) => string;
  /** Optional array of values where tick marks/labels should be displayed */
  marks?: number[];
  /** Optional additional class name for the wrapper */
  className?: string;
}

/**
 * Styled range slider component with value badge, min/max bounds,
 * and optional tick mark indicators.
 */
export function Slider({
  min,
  max,
  step,
  value,
  onChange,
  label,
  formatValue,
  marks,
  className = '',
}: SliderProps): React.JSX.Element {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1;
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const safeValue = Number.isFinite(value)
    ? Math.max(safeMin, Math.min(safeMax, value))
    : safeMin;

  const percentage = Math.max(
    0,
    Math.min(100, ((safeValue - safeMin) / (safeMax - safeMin)) * 100)
  );

  const displayCurrent = formatValue ? formatValue(safeValue) : safeValue.toString();
  const displayMin = formatValue ? formatValue(safeMin) : safeMin.toString();
  const displayMax = formatValue ? formatValue(safeMax) : safeMax.toString();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(e.target.value);
    if (Number.isFinite(nextVal)) {
      onChange(nextVal);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Top Header: Label & Value Badge */}
      <div className="flex items-center justify-between mb-2">
        {label ? (
          <span className="text-sm font-medium text-slate-300">{label}</span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {displayCurrent}
        </span>
      </div>

      {/* Slider Track Container with Badge above Thumb */}
      <div className="relative pt-4 pb-1">
        {/* Floating Thumb Badge */}
        <div
          className="absolute top-0 -translate-x-1/2 pointer-events-none transition-all duration-75"
          style={{ left: `${percentage}%` }}
        >
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-700 text-slate-200 border border-slate-600 rounded shadow">
            {displayCurrent}
          </span>
        </div>

        {/* Range Input */}
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={safeStep}
          value={safeValue}
          onChange={handleChange}
          aria-label={label || 'Range slider'}
          aria-valuemin={safeMin}
          aria-valuemax={safeMax}
          aria-valuenow={safeValue}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 transition-colors"
        />

        {/* Tick Marks (if provided) */}
        {marks && marks.length > 0 && (
          <div className="relative w-full h-3 mt-1">
            {marks.map((mark) => {
              if (mark < safeMin || mark > safeMax) return null;
              const markPct = ((mark - safeMin) / (safeMax - safeMin)) * 100;
              const isSelected = mark === safeValue;
              return (
                <button
                  type="button"
                  key={mark}
                  onClick={() => onChange(mark)}
                  style={{ left: `${markPct}%` }}
                  title={`Set to ${formatValue ? formatValue(mark) : mark}`}
                  className={`absolute -translate-x-1/2 flex flex-col items-center group cursor-pointer text-[10px] focus:outline-none`}
                >
                  <span
                    className={`w-1 h-1.5 rounded-full ${
                      isSelected ? 'bg-blue-400' : 'bg-slate-500 group-hover:bg-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Min and Max Range Labels */}
      <div className="flex justify-between items-center text-[11px] text-slate-400 px-0.5 mt-0.5 select-none">
        <span>{displayMin}</span>
        <span>{displayMax}</span>
      </div>
    </div>
  );
}
