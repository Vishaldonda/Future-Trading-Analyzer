import React, { useState } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import { DEFAULT_FEE_CONFIG, type FeeConfig } from '../../calculations/fees';
import { Tooltip } from '../common/Tooltip';

export interface FeeSettingsProps {
  /** Optional container class name */
  className?: string;
  /** Whether the section is initially expanded */
  defaultOpen?: boolean;
}

/**
 * Collapsible configuration panel for maker, taker, and funding rates.
 * Allows custom fee modeling and resets to exchange default rates.
 */
export function FeeSettings({
  className = '',
  defaultOpen = false,
}: FeeSettingsProps): React.JSX.Element {
  const { state, dispatch } = useTradingContext();
  const { feeConfig } = state;
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  const makerPercent = (feeConfig.makerRate * 100).toFixed(3).replace(/\.?0+$/, '');
  const takerPercent = (feeConfig.takerRate * 100).toFixed(3).replace(/\.?0+$/, '');
  const fundingPercent =
    feeConfig.fundingRate !== undefined
      ? (feeConfig.fundingRate * 100).toFixed(4).replace(/\.?0+$/, '')
      : '0';

  const handleMakerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newRate = Number.isFinite(val) ? Math.max(0, val / 100) : 0;
    const nextConfig: FeeConfig = {
      ...feeConfig,
      makerRate: newRate,
    };
    dispatch({ type: 'SET_FEE_CONFIG', payload: nextConfig });
  };

  const handleTakerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newRate = Number.isFinite(val) ? Math.max(0, val / 100) : 0;
    const nextConfig: FeeConfig = {
      ...feeConfig,
      takerRate: newRate,
    };
    dispatch({ type: 'SET_FEE_CONFIG', payload: nextConfig });
  };

  const handleFundingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newRate = Number.isFinite(val) ? val / 100 : 0;
    const nextConfig: FeeConfig = {
      ...feeConfig,
      fundingRate: newRate,
    };
    dispatch({ type: 'SET_FEE_CONFIG', payload: nextConfig });
  };

  const handleResetFees = () => {
    dispatch({ type: 'SET_FEE_CONFIG', payload: DEFAULT_FEE_CONFIG });
  };

  return (
    <div className={`bg-slate-800/50 rounded-lg p-3 border border-slate-700/80 transition-all ${className}`}>
      {/* Header with Chevron Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Fee & Funding Settings</span>
          <span className="text-xs text-slate-400 bg-slate-700/80 px-2 py-0.5 rounded">
            Advanced
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-4 pt-3 border-t border-slate-700/70 space-y-3">
          {/* Maker Fee Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="maker-fee-input" className="text-xs font-medium text-slate-300">
                Maker Fee Rate (%)
              </label>
              <Tooltip content="Fee charged when adding liquidity to the order book. Default: 0.02%">
                <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
              </Tooltip>
            </div>
            <div className="relative">
              <input
                id="maker-fee-input"
                type="number"
                step="0.001"
                min="0"
                value={makerPercent}
                onChange={handleMakerChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 select-none">
                %
              </span>
            </div>
          </div>

          {/* Taker Fee Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="taker-fee-input" className="text-xs font-medium text-slate-300">
                Taker Fee Rate (%)
              </label>
              <Tooltip content="Fee charged when removing liquidity with market orders. Default: 0.04%">
                <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
              </Tooltip>
            </div>
            <div className="relative">
              <input
                id="taker-fee-input"
                type="number"
                step="0.001"
                min="0"
                value={takerPercent}
                onChange={handleTakerChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 select-none">
                %
              </span>
            </div>
          </div>

          {/* Funding Rate Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="funding-fee-input" className="text-xs font-medium text-slate-300">
                Funding Rate Override (%)
              </label>
              <Tooltip content="Per-interval funding rate. Positive = Longs pay Shorts. Negative = Shorts pay Longs.">
                <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
              </Tooltip>
            </div>
            <div className="relative">
              <input
                id="funding-fee-input"
                type="number"
                step="0.0001"
                value={fundingPercent}
                onChange={handleFundingChange}
                placeholder="0.0000"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 select-none">
                %
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleResetFees}
              className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 cursor-pointer transition-colors"
            >
              Reset Fees
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
