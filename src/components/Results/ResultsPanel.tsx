import React from 'react';
import { useTradingContext } from '../../context/TradingContext';
import {
  calcPositionSize,
  calcExitPrice,
  calcPriceChange,
  calcGrossPnL,
  calcNetPnL,
  calcReturnOnMargin,
  calcRemainingEquity,
} from '../../calculations/pnl';
import { calcRoundTripFees, calcFundingPayment } from '../../calculations/fees';
import { formatCurrency, formatPercentage, formatBtcPrice } from '../../utils/formatting';
import { MetricsCard } from './MetricsCard';
import { LiquidationWarning } from './LiquidationWarning';

export interface ResultsPanelProps {
  /** Optional container class name */
  className?: string;
}

/**
 * Main results and outcomes panel displaying position sizing,
 * gross/net profit and loss, fees, return on margin, and liquidation risk.
 */
export function ResultsPanel({ className = '' }: ResultsPanelProps): React.JSX.Element {
  const { state } = useTradingContext();
  const { margin, leverage, direction, entryPrice, percentageMove, feeConfig, symbol } = state;

  // 1. Position sizing
  const positionSize = calcPositionSize(margin, leverage);

  // 2. Simulated exit price & price change
  const exitPrice = calcExitPrice(entryPrice, percentageMove);
  const dollarChange = exitPrice - entryPrice;
  const pctChange = calcPriceChange(entryPrice, exitPrice);

  // 3. Gross P&L
  const grossPnl = calcGrossPnL(positionSize, percentageMove, direction);

  // 4. Fees and funding
  const tradingFees = calcRoundTripFees(
    positionSize,
    feeConfig.makerRate,
    feeConfig.takerRate
  );
  const fundingPayment = feeConfig.fundingRate
    ? calcFundingPayment(positionSize, feeConfig.fundingRate)
    : 0;

  // 5. Net P&L, Return on Margin, and Remaining Equity
  const netPnl = calcNetPnL(grossPnl, tradingFees, fundingPayment);
  const returnOnMargin = calcReturnOnMargin(netPnl, margin);
  const remainingEquity = calcRemainingEquity(margin, netPnl);

  // Directional variants helper
  const getPnlVariant = (val: number): 'profit' | 'loss' | 'default' => {
    if (val > 0.00001) return 'profit';
    if (val < -0.00001) return 'loss';
    return 'default';
  };

  return (
    <div className={`space-y-4 bg-slate-900 rounded-xl border border-slate-700 p-4 ${className}`}>
      {/* Position Overview Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-3 flex items-center justify-between">
          <span>Position Overview</span>
          <span className="text-xs font-normal text-slate-400">
            {direction} {leverage}×
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <MetricsCard
            label="Position Size"
            value={formatCurrency(positionSize)}
            sublabel={`${margin} USDT × ${leverage}×`}
            tooltip="Total notional trading value controlled by your initial margin."
          />
          <MetricsCard
            label="Exit Price"
            value={`$${formatBtcPrice(exitPrice)}`}
            sublabel={formatPercentage(percentageMove)}
            tooltip="Projected market price based on the selected percentage movement."
          />
          <MetricsCard
            label={`${symbol} Price Diff`}
            value={`${dollarChange >= 0 ? '+' : ''}${formatCurrency(dollarChange)}`}
            sublabel={formatPercentage(pctChange)}
            variant={dollarChange > 0 ? 'profit' : dollarChange < 0 ? 'loss' : 'default'}
            tooltip="Absolute dollar difference between simulated exit price and entry price."
          />
          <MetricsCard
            label="Allocated Margin"
            value={formatCurrency(margin)}
            sublabel={state.marginMode.toUpperCase()}
            tooltip="Your own collateral backing this futures contract."
          />
        </div>
      </div>

      {/* P&L Breakdown Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-3">
          Profit & Loss Analysis
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <MetricsCard
            label="Gross P&L"
            value={formatCurrency(grossPnl, 2)}
            variant={getPnlVariant(grossPnl)}
            sublabel="Before fees"
            tooltip="Raw profit or loss before exchange trading commissions and funding."
          />
          <MetricsCard
            label="Trading Fees"
            value={tradingFees > 0 ? formatCurrency(-tradingFees, 2) : '$0.00'}
            variant="loss"
            sublabel="Entry + Exit"
            tooltip="Estimated round-trip taker trading fees based on position notional."
          />
          <MetricsCard
            label="Funding Payment"
            value={
              fundingPayment !== 0
                ? formatCurrency(-fundingPayment, 2)
                : '$0.00'
            }
            variant={fundingPayment > 0 ? 'loss' : fundingPayment < 0 ? 'profit' : 'default'}
            sublabel={feeConfig.fundingRate ? `${(feeConfig.fundingRate * 100).toFixed(4)}%` : '0.00%'}
            tooltip="Cost or rebate for holding a perpetual position over the 8-hour funding period."
          />
          <MetricsCard
            label="Net P&L"
            value={formatCurrency(netPnl, 2)}
            variant={getPnlVariant(netPnl)}
            sublabel="Realized outcome"
            tooltip="Net cash profit or loss after deducting trading fees and funding."
          />
          <MetricsCard
            label="Return on Margin"
            value={formatPercentage(returnOnMargin)}
            variant={getPnlVariant(returnOnMargin)}
            sublabel="ROM %"
            tooltip="Percentage return on your allocated margin (Net P&L / Margin)."
          />
          <MetricsCard
            label="Remaining Equity"
            value={formatCurrency(remainingEquity, 2)}
            variant={remainingEquity <= 0 ? 'loss' : 'default'}
            sublabel="Margin + Net P&L"
            tooltip="Estimated remaining capital in this position after realizing Net P&L."
          />
        </div>
      </div>

      {/* Liquidation Risk Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-3">
          Risk & Liquidation
        </h3>
        <LiquidationWarning />
      </div>
    </div>
  );
}
