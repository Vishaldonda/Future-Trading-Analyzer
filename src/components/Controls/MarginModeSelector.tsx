import React from 'react';
import { useTradingContext } from '../../context/TradingContext';
import type { MarginMode } from '../../context/types';
import { Tooltip } from '../common/Tooltip';
import { Toggle } from '../common/Toggle';

export interface MarginModeSelectorProps {
  /** Optional controlled mode value; defaults to context state if omitted */
  value?: MarginMode;
  /** Optional change handler; defaults to dispatching to context if omitted */
  onChange?: (mode: MarginMode) => void;
  /** Optional container class name */
  className?: string;
}

const MARGIN_MODE_OPTIONS: { value: MarginMode; label: string }[] = [
  { value: 'isolated', label: 'Isolated' },
  { value: 'cross', label: 'Cross' },
];

/**
 * Margin mode selector toggle supporting Isolated and Cross margin modes
 * with risk explanations and information tooltips.
 */
export function MarginModeSelector({
  value,
  onChange,
  className = '',
}: MarginModeSelectorProps): React.JSX.Element {
  const { state, dispatch } = useTradingContext();

  const currentMode: MarginMode = value ?? state.marginMode;

  const handleModeChange = (mode: MarginMode) => {
    if (onChange) {
      onChange(mode);
    } else {
      dispatch({ type: 'SET_MARGIN_MODE', payload: mode });
    }
  };

  const explanations: Record<MarginMode, string> = {
    isolated: 'Only the allocated margin is at risk. If liquidated, you lose only this margin.',
    cross:
      'All available balance in your account is used as margin. Higher risk of total account liquidation.',
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label and Info Tooltip */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-300">Margin Mode</span>
          <Tooltip content="Choose how risk is isolated or shared across your account balance.">
            <button
              type="button"
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-help"
              aria-label="Margin mode explanation"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeWidth="2" strokeLinecap="round" d="M12 16v-4m0-4h.01" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Segmented Control */}
      <Toggle<MarginMode>
        options={MARGIN_MODE_OPTIONS}
        value={currentMode}
        onChange={handleModeChange}
        fullWidth
        size="sm"
      />

      {/* Contextual Mode Explanation */}
      <div className="mt-2 text-xs text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-700/60 flex items-start gap-1.5">
        <svg
          className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{explanations[currentMode]}</span>
      </div>
    </div>
  );
}
