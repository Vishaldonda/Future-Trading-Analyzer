import React, { useState, useMemo } from 'react';
import {
  calcExitPrice,
  calcGrossPnL,
  calcNetPnL,
  calcPositionSize,
  calcRemainingEquity,
  calcReturnOnMargin,
  type TradeDirection,
} from '../../calculations/pnl';
import {
  calcFundingPayment,
  calcRoundTripFees,
  DEFAULT_MAKER_FEE_RATE,
  DEFAULT_TAKER_FEE_RATE,
} from '../../calculations/fees';
import {
  estimateLiquidationPrice,
  type MarginMode as LiqMarginMode,
} from '../../calculations/liquidation';
import { generateScenarioTable } from '../../calculations/scenarios';
import {
  formatBtcPrice,
  formatCurrency,
  formatPercentage,
  formatUsdt,
} from '../../utils/formatting';
import {
  DEFAULT_ENTRY_PRICE,
  DEFAULT_LEVERAGE,
  DEFAULT_MARGIN,
  MAX_LEVERAGE,
} from '../../utils/constants';
import { CsvExport } from '../Tables/CsvExport';

const QUICK_SCENARIOS = [-5, -2, -1, 1, 2, 5] as const;

/**
 * Dedicated scenario playground with independent local state.
 * Allows interactive adjustments of margin, leverage, entry price,
 * price movement, fee structures, and margin modes with instant P&L feedback.
 */
export function ScenarioPlayground(): React.JSX.Element {
  // Independent Local State
  const [margin, setMargin] = useState<number>(DEFAULT_MARGIN);
  const [leverage, setLeverage] = useState<number>(DEFAULT_LEVERAGE);
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(DEFAULT_ENTRY_PRICE);
  const [percentageMove, setPercentageMove] = useState<number>(1);
  const [makerRatePct, setMakerRatePct] = useState<number>(DEFAULT_MAKER_FEE_RATE * 100); // 0.02%
  const [takerRatePct, setTakerRatePct] = useState<number>(DEFAULT_TAKER_FEE_RATE * 100); // 0.04%
  const [fundingRatePct, setFundingRatePct] = useState<number>(0); // 0.00%
  const [marginMode, setMarginMode] = useState<LiqMarginMode>('ISOLATED');

  // Convert percentage rates back to decimal fractions
  const makerRate = makerRatePct / 100;
  const takerRate = takerRatePct / 100;
  const fundingRate = fundingRatePct / 100;

  // Primary Position Calculations
  const positionSize = useMemo(() => calcPositionSize(margin, leverage), [margin, leverage]);
  const exitPrice = useMemo(() => calcExitPrice(entryPrice, percentageMove), [entryPrice, percentageMove]);
  const priceChangeDollar = exitPrice - entryPrice;

  const grossPnl = useMemo(
    () => calcGrossPnL(positionSize, percentageMove, direction),
    [positionSize, percentageMove, direction]
  );
  const returnOnMargin = useMemo(
    () => calcReturnOnMargin(grossPnl, margin),
    [grossPnl, margin]
  );

  const totalFees = useMemo(
    () => calcRoundTripFees(positionSize, makerRate, takerRate),
    [positionSize, makerRate, takerRate]
  );
  // Funding payment: Long pays positive funding, Short receives positive funding
  const fundingCost = useMemo(
    () => calcFundingPayment(positionSize, fundingRate) * (direction === 'LONG' ? 1 : -1),
    [positionSize, fundingRate, direction]
  );

  const netPnl = useMemo(
    () => calcNetPnL(grossPnl, totalFees, fundingCost),
    [grossPnl, totalFees, fundingCost]
  );
  const netReturnOnMargin = useMemo(
    () => calcReturnOnMargin(netPnl, margin),
    [netPnl, margin]
  );
  const remainingEquity = useMemo(
    () => calcRemainingEquity(margin, netPnl),
    [margin, netPnl]
  );

  // Liquidation Price
  const liquidation = useMemo(() => {
    return estimateLiquidationPrice({
      entryPrice,
      margin,
      leverage,
      direction,
      marginMode,
    });
  }, [entryPrice, margin, leverage, direction, marginMode]);

  // Reset to default settings
  const handleReset = () => {
    setMargin(DEFAULT_MARGIN);
    setLeverage(DEFAULT_LEVERAGE);
    setDirection('LONG');
    setEntryPrice(DEFAULT_ENTRY_PRICE);
    setPercentageMove(1);
    setMakerRatePct(DEFAULT_MAKER_FEE_RATE * 100);
    setTakerRatePct(DEFAULT_TAKER_FEE_RATE * 100);
    setFundingRatePct(0);
    setMarginMode('ISOLATED');
  };

  // Full 21-scenario data computed for current playground configuration
  const scenariosData = useMemo(() => {
    if (entryPrice <= 0 || margin <= 0 || leverage <= 0) {
      return [];
    }
    return generateScenarioTable({
      entryPrice,
      margin,
      leverage,
      feeConfig: {
        makerRate,
        takerRate,
        fundingRate,
      },
    });
  }, [entryPrice, margin, leverage, makerRate, takerRate, fundingRate]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Futures Scenario Playground</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Interactive Sandbox
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Experiment with leverage, margins, custom price movements, and simulated fee rates in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
          <CsvExport
            data={scenariosData}
            filename="playground-custom-scenarios"
            label="Export Scenarios CSV"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
          />
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Controls */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h3 className="text-base font-semibold text-white tracking-wide">Position Parameters</h3>
            <span className="text-xs text-slate-400 font-mono">Isolated Sandbox</span>
          </div>

          {/* Direction Toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Trade Direction
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setDirection('LONG')}
                className={`py-2 text-sm font-bold rounded-md transition-all cursor-pointer ${
                  direction === 'LONG'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                LONG ▲
              </button>
              <button
                type="button"
                onClick={() => setDirection('SHORT')}
                className={`py-2 text-sm font-bold rounded-md transition-all cursor-pointer ${
                  direction === 'SHORT'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SHORT ▼
              </button>
            </div>
          </div>

          {/* Margin Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pg-margin" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Initial Margin (USDT)
              </label>
              <span className="text-xs font-mono text-slate-300 font-semibold">{formatUsdt(margin)}</span>
            </div>
            <div className="relative">
              <input
                id="pg-margin"
                type="number"
                min="0.1"
                step="any"
                value={margin === 0 ? '' : margin}
                onChange={(e) => setMargin(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                placeholder="10.00"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-semibold pointer-events-none">
                USDT
              </span>
            </div>
            {/* Quick Margin Presets */}
            <div className="flex gap-1.5 mt-2">
              {[10, 50, 100, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMargin(preset)}
                  className={`flex-1 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                    margin === preset
                      ? 'bg-blue-600/30 text-blue-400 border-blue-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Leverage Slider & Value */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pg-leverage" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Leverage Multiplier
              </label>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {leverage}×
              </span>
            </div>
            <input
              id="pg-leverage"
              type="range"
              min="1"
              max={MAX_LEVERAGE}
              step="1"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value, 10) || 1)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            {/* Quick Leverage Presets */}
            <div className="flex gap-1.5 mt-2">
              {[1, 5, 10, 20, 50, 100, 125].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLeverage(preset)}
                  className={`flex-1 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                    leverage === preset
                      ? 'bg-blue-600/30 text-blue-400 border-blue-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {preset}×
                </button>
              ))}
            </div>
          </div>

          {/* Entry Price Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pg-entry" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Entry Price (USDT)
              </label>
              <span className="text-xs font-mono text-slate-300 font-semibold">${formatBtcPrice(entryPrice)}</span>
            </div>
            <div className="relative">
              <input
                id="pg-entry"
                type="number"
                min="0.0001"
                step="any"
                value={entryPrice === 0 ? '' : entryPrice}
                onChange={(e) => setEntryPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                placeholder="80000.00"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500 font-semibold pointer-events-none">
                USDT
              </span>
            </div>
          </div>

          {/* Price Movement Slider + Custom Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pg-move-num" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Simulated Price Movement (%)
              </label>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                  percentageMove > 0
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : percentageMove < 0
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}
              >
                {formatPercentage(percentageMove)}
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={percentageMove}
                onChange={(e) => setPercentageMove(parseFloat(e.target.value) || 0)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex items-center gap-2">
                <input
                  id="pg-move-num"
                  type="number"
                  step="0.01"
                  value={percentageMove}
                  onChange={(e) => setPercentageMove(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="Custom % move"
                />
                <button
                  type="button"
                  onClick={() => setPercentageMove(0)}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  0%
                </button>
              </div>
            </div>
          </div>

          {/* Margin Mode Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Margin Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setMarginMode('ISOLATED')}
                className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  marginMode === 'ISOLATED'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Isolated
              </button>
              <button
                type="button"
                onClick={() => setMarginMode('CROSS')}
                className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  marginMode === 'CROSS'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cross
              </button>
            </div>
          </div>

          {/* Fee & Funding Rate Inputs */}
          <div className="border-t border-slate-700 pt-4 space-y-3">
            <span className="text-xs font-semibold text-slate-300 block">Fee & Funding Rates (%)</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="pg-maker" className="block text-[11px] text-slate-400 mb-1">Maker Fee %</label>
                <input
                  id="pg-maker"
                  type="number"
                  step="0.005"
                  value={makerRatePct}
                  onChange={(e) => setMakerRatePct(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="pg-taker" className="block text-[11px] text-slate-400 mb-1">Taker Fee %</label>
                <input
                  id="pg-taker"
                  type="number"
                  step="0.005"
                  value={takerRatePct}
                  onChange={(e) => setTakerRatePct(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="pg-funding" className="block text-[11px] text-slate-400 mb-1">8h Funding %</label>
                <input
                  id="pg-funding"
                  type="number"
                  step="0.001"
                  value={fundingRatePct}
                  onChange={(e) => setFundingRatePct(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Results */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-base font-semibold text-white tracking-wide">Simulation Results</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {direction} {leverage}×
              </span>
            </div>

            {/* Prominent Large P&L & ROM Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gross P&L */}
              <div className="bg-slate-900/90 rounded-xl border border-slate-700 p-4">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                  Gross P&L
                </span>
                <div
                  className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                    grossPnl > 0 ? 'text-green-400' : grossPnl < 0 ? 'text-red-400' : 'text-slate-200'
                  }`}
                >
                  {formatCurrency(grossPnl, 2)}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Return: <span className={grossPnl > 0 ? 'text-green-400 font-medium' : grossPnl < 0 ? 'text-red-400 font-medium' : ''}>{formatPercentage(returnOnMargin)}</span>
                </div>
              </div>

              {/* Net P&L (after fees & funding) */}
              <div className="bg-slate-900/90 rounded-xl border border-slate-700 p-4">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">
                  Net P&L (After Fees)
                </span>
                <div
                  className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                    netPnl > 0 ? 'text-green-400' : netPnl < 0 ? 'text-red-400' : 'text-slate-200'
                  }`}
                >
                  {formatCurrency(netPnl, 2)}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Net ROM: <span className={netPnl > 0 ? 'text-green-400 font-medium' : netPnl < 0 ? 'text-red-400 font-medium' : ''}>{formatPercentage(netReturnOnMargin)}</span>
                </div>
              </div>
            </div>

            {/* Detailed Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Position Size */}
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-750">
                <span className="text-[11px] text-slate-400 block mb-0.5">Position Size</span>
                <span className="text-sm font-bold font-mono text-white">{formatCurrency(positionSize)}</span>
              </div>

              {/* Exit Price */}
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-750">
                <span className="text-[11px] text-slate-400 block mb-0.5">Exit Price</span>
                <span className="text-sm font-bold font-mono text-white">${formatBtcPrice(exitPrice)}</span>
              </div>

              {/* Price Change */}
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-750">
                <span className="text-[11px] text-slate-400 block mb-0.5">Price Change</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    priceChangeDollar > 0 ? 'text-green-400' : priceChangeDollar < 0 ? 'text-red-400' : 'text-slate-300'
                  }`}
                >
                  {priceChangeDollar >= 0 ? `+$${formatBtcPrice(priceChangeDollar)}` : `-$${formatBtcPrice(Math.abs(priceChangeDollar))}`}
                </span>
              </div>

              {/* Fees */}
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-750">
                <span className="text-[11px] text-slate-400 block mb-0.5">Round-Trip Fees</span>
                <span className="text-sm font-semibold font-mono text-amber-400">{formatCurrency(totalFees, 2)}</span>
              </div>

              {/* Funding */}
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-750">
                <span className="text-[11px] text-slate-400 block mb-0.5">Funding Payment</span>
                <span className={`text-sm font-semibold font-mono ${fundingCost > 0 ? 'text-red-400' : fundingCost < 0 ? 'text-green-400' : 'text-slate-300'}`}>
                  {formatCurrency(fundingCost, 2)}
                </span>
              </div>

              {/* Remaining Equity */}
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-750">
                <span className="text-[11px] text-slate-400 block mb-0.5">Remaining Equity</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    remainingEquity <= 0 ? 'text-red-400 font-extrabold' : 'text-white'
                  }`}
                >
                  {formatCurrency(remainingEquity)}
                </span>
              </div>
            </div>

            {/* Liquidation Estimate Banner */}
            <div className="p-3.5 bg-slate-900/90 rounded-lg border border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Est. Liquidation Price</span>
                <span className="text-base font-bold font-mono text-amber-400">
                  {liquidation.price !== null && liquidation.price > 0
                    ? `$${formatBtcPrice(liquidation.price)}`
                    : 'N/A'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {marginMode}
                </span>
                {liquidation.warning && (
                  <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 leading-tight">
                    {liquidation.warning}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Scenario Cards */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Quick Scenario Snapshots (Click to apply)
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {QUICK_SCENARIOS.map((pct) => {
                  const qGross = calcGrossPnL(positionSize, pct, direction);
                  const qRom = calcReturnOnMargin(qGross, margin);
                  const isCurrent = percentageMove === pct;

                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPercentageMove(pct)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600/30 border-blue-500 shadow-sm'
                          : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-slate-300">
                        {formatPercentage(pct, 0)}
                      </div>
                      <div
                        className={`text-xs font-mono font-semibold mt-0.5 ${
                          qGross > 0 ? 'text-green-400' : qGross < 0 ? 'text-red-400' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(qGross, 2)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {formatPercentage(qRom, 1)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Formula: P&L = Position Size × Price Move % × Direction</span>
            <span>Real-time pure math</span>
          </div>
        </div>
      </div>
    </div>
  );
}
