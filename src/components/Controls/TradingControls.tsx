import React from 'react';
import { useTradingContext } from '../../context/TradingContext';
import { Tooltip } from '../common/Tooltip';
import { Slider } from '../common/Slider';
import { Toggle } from '../common/Toggle';
import { MarginModeSelector } from './MarginModeSelector';
import { FeeSettings } from './FeeSettings';
import { MAX_LEVERAGE } from '../../utils/constants';
import type { Direction } from '../../context/types';

export interface TradingControlsProps {
  /** Optional container class name */
  className?: string;
}

const DIRECTION_OPTIONS: { value: Direction; label: string }[] = [
  { value: 'LONG', label: 'LONG' },
  { value: 'SHORT', label: 'SHORT' },
];

const LEVERAGE_QUICK_PRESETS = [1, 2, 5, 10, 20, 50, 75, 100, 125];

/**
 * Main side panel containing parameter controls for the futures trade:
 * margin, leverage, direction, entry price, price movement, margin mode, and fees.
 */
export function TradingControls({ className = '' }: TradingControlsProps): React.JSX.Element {
  const { state, dispatch } = useTradingContext();
  const {
    margin,
    leverage,
    direction,
    entryPrice,
    percentageMove,
    markPrice,
    symbol,
    availableSymbols,
  } = state;

  // Determine maximum leverage permitted for the active symbol
  const currentSymbolInfo = availableSymbols.find((s) => s.symbol === symbol);
  const maxLeverageAllowed = currentSymbolInfo?.maxLeverage ?? MAX_LEVERAGE;
  const quickLeveragePresets = LEVERAGE_QUICK_PRESETS.filter((p) => p <= maxLeverageAllowed);

  // 1. Margin handlers
  const handleMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      dispatch({ type: 'SET_MARGIN', payload: Math.max(1, val) });
    }
  };

  // 2. Leverage handlers
  const handleLeverageChange = (val: number) => {
    const clamped = Math.max(1, Math.min(maxLeverageAllowed, Math.round(val)));
    dispatch({ type: 'SET_LEVERAGE', payload: clamped });
  };

  // 3. Direction handler
  const handleDirectionChange = (val: Direction) => {
    dispatch({ type: 'SET_DIRECTION', payload: val });
  };

  // 4. Entry Price handlers
  const handleEntryPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      dispatch({ type: 'SET_ENTRY_PRICE', payload: Math.max(0, val) });
    }
  };

  const handleUseLivePrice = () => {
    if (markPrice !== null && markPrice > 0) {
      dispatch({ type: 'SET_ENTRY_PRICE', payload: markPrice });
    }
  };

  // 5. Price Movement handlers
  const handlePercentageMoveChange = (val: number) => {
    dispatch({ type: 'SET_PERCENTAGE_MOVE', payload: val });
  };

  const handleCustomPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      dispatch({ type: 'SET_PERCENTAGE_MOVE', payload: val });
    }
  };

  // 7. Reset handler
  const handleReset = () => {
    dispatch({ type: 'RESET_DEFAULTS' });
  };

  return (
    <aside
      aria-label="Trading controls"
      className={`space-y-4 bg-slate-800 rounded-xl border border-slate-700 p-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <h2 className="text-base font-semibold text-slate-200">Position Parameters</h2>
        <span className="text-xs font-mono text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded">
          {symbol}
        </span>
      </div>

      {/* 1. Initial Margin */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <label htmlFor="initial-margin-input" className="text-sm font-medium text-slate-300">
              Initial Margin
            </label>
            <Tooltip content="Capital allocated from your wallet to open this position. Minimum 1 USDT.">
              <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
            </Tooltip>
          </div>
          <span className="text-xs text-slate-400">Min 1 USDT</span>
        </div>
        <div className="relative">
          <input
            id="initial-margin-input"
            type="number"
            min="1"
            step="1"
            value={margin}
            onChange={handleMarginChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">
            USDT
          </span>
        </div>
      </div>

      {/* 2. Leverage */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-300">Leverage</span>
            <Tooltip content="Multiplier applied to your margin. Increases both profit potential and risk of liquidation.">
              <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
            </Tooltip>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {leverage}×
          </span>
        </div>

        <Slider
          min={1}
          max={maxLeverageAllowed}
          step={1}
          value={leverage}
          onChange={handleLeverageChange}
          formatValue={(val) => `${val}×`}
        />

        {/* Quick-select presets */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {quickLeveragePresets.map((preset) => {
            const isActive = preset === leverage;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleLeverageChange(preset)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
              >
                {preset}×
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Direction */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm font-medium text-slate-300">Direction</span>
          <Tooltip content="LONG profits when market price rises; SHORT profits when market price drops.">
            <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
          </Tooltip>
        </div>
        <Toggle<Direction>
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={handleDirectionChange}
          fullWidth
          size="md"
        />
      </div>

      {/* 4. Entry Price */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <label htmlFor="entry-price-input" className="text-sm font-medium text-slate-300">
              Entry Price
            </label>
            <Tooltip content="The price at which the position is opened. Used as the benchmark for P&L calculations.">
              <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
            </Tooltip>
          </div>
          <button
            type="button"
            onClick={handleUseLivePrice}
            disabled={markPrice === null}
            className={`text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              markPrice !== null
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                : 'bg-slate-700/50 text-slate-500 border-slate-600 cursor-not-allowed'
            }`}
          >
            Use Live Price
          </button>
        </div>
        <div className="relative">
          <input
            id="entry-price-input"
            type="number"
            step="any"
            min="0"
            value={entryPrice}
            onChange={handleEntryPriceChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">
            USDT
          </span>
        </div>
      </div>

      {/* 5. Price Movement */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-300">Price Movement</span>
            <Tooltip content="Hypothetical price change scenario to simulate outcome and P&L.">
              <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
            </Tooltip>
          </div>
          {/* Custom Percentage Input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              value={percentageMove}
              onChange={handleCustomPercentageChange}
              aria-label="Custom percentage move"
              className="w-16 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-right text-slate-200 focus:border-blue-500 outline-none"
            />
            <span className="text-xs text-slate-400">%</span>
          </div>
        </div>

        <Slider
          min={-10}
          max={10}
          step={1}
          value={percentageMove}
          onChange={handlePercentageMoveChange}
          formatValue={(val) => `${val > 0 ? '+' : ''}${val}%`}
          marks={[-10, -5, 0, 5, 10]}
        />
      </div>

      {/* 6. Margin Mode */}
      <MarginModeSelector />

      {/* Advanced Fees */}
      <FeeSettings />

      {/* 7. Reset Defaults Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="w-full py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-650 text-slate-300 hover:text-white border border-slate-600 text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset to Defaults
        </button>
      </div>
    </aside>
  );
}
