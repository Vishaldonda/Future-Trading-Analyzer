import React from 'react';
import { useTradingContext } from '../../context/TradingContext';
import { estimateLiquidationPrice } from '../../calculations/liquidation';
import { formatBtcPrice } from '../../utils/formatting';
import { Tooltip } from '../common/Tooltip';

export interface LiquidationWarningProps {
  /** Optional container class name */
  className?: string;
}

export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Liquidation risk component calculating estimated liquidation price,
 * distance from entry price, and dynamic risk level warnings.
 */
export function LiquidationWarning({
  className = '',
}: LiquidationWarningProps): React.JSX.Element {
  const { state } = useTradingContext();
  const { entryPrice, margin, leverage, direction, marginMode } = state;

  const estimateResult = estimateLiquidationPrice({
    entryPrice,
    margin,
    leverage,
    direction,
    marginMode: marginMode.toUpperCase() as 'ISOLATED' | 'CROSS',
  });

  const liqPrice = estimateResult.price;

  // Calculate distance percentage from entry price
  let distancePct = 0;
  if (liqPrice !== null && liqPrice > 0 && entryPrice > 0) {
    distancePct = (Math.abs(liqPrice - entryPrice) / entryPrice) * 100;
  }

  // Determine risk level based on distance buffer
  let riskLevel: RiskLevel = 'low';
  if (liqPrice === null || liqPrice <= 0) {
    riskLevel = 'low';
  } else if (distancePct < 10) {
    riskLevel = 'high';
  } else if (distancePct <= 20) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Styling configurations for risk levels
  const riskStyles = {
    low: {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/20',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      label: 'Low Risk (>20% buffer)',
      icon: '🛡️',
    },
    medium: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/20',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      label: 'Medium Risk (10–20% buffer)',
      icon: '⚠️',
    },
    high: {
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/20',
      text: 'text-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      label: 'High Risk (<10% buffer)',
      icon: '🚨',
    },
  }[riskLevel];

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${riskStyles.border} ${riskStyles.bg} ${className}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{riskStyles.icon}</span>
          <span className="text-sm font-semibold text-slate-200">Liquidation Risk</span>
          <Tooltip content="Price level at which your position will be automatically closed by the exchange to prevent negative balance.">
            <span className="text-slate-400 hover:text-slate-200 cursor-help text-xs">ℹ</span>
          </Tooltip>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${riskStyles.badgeBg}`}
        >
          {riskStyles.label}
        </span>
      </div>

      {/* Main Metrics: Price & Distance */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            Est. Liquidation Price
          </div>
          <div className={`text-base font-bold font-mono mt-0.5 ${riskStyles.text}`}>
            {liqPrice !== null && liqPrice > 0 ? `$${formatBtcPrice(liqPrice)}` : 'None / 0.00'}
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            Distance from Entry
          </div>
          <div className={`text-base font-bold font-mono mt-0.5 ${riskStyles.text}`}>
            {liqPrice !== null && liqPrice > 0 ? `${distancePct.toFixed(2)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Buffer Bar Visualization */}
      {liqPrice !== null && liqPrice > 0 && (
        <div className="mb-3">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                riskLevel === 'high'
                  ? 'bg-rose-500'
                  : riskLevel === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, distancePct * 2))}%` }}
            />
          </div>
        </div>
      )}

      {/* Additional Engine Warning (if any) */}
      {estimateResult.warning && (
        <p className="text-xs text-amber-400/90 mb-2 leading-relaxed">
          {estimateResult.warning}
        </p>
      )}

      {/* Mandatory Disclaimer */}
      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <svg
          className="w-3.5 h-3.5 text-slate-500 shrink-0"
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
        <span>This is an estimate. Actual liquidation may differ.</span>
      </div>
    </div>
  );
}
