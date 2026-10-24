import React from 'react';
import type { ScenarioRow } from '../../calculations/scenarios';
import { formatBtcPrice, formatCurrency, formatPercentage } from '../../utils/formatting';

export interface LeverageTableProps {
  /** Array of 21 scenario rows (-10% to +10%) */
  rows: ScenarioRow[];
  /** Leverage multiplier level */
  leverage: number;
}

/**
 * Helper to determine CSS color class based on numeric value.
 */
function getPnlColorClass(value: number): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-slate-400';
}

/**
 * Renders a single leverage scenario comparison table.
 * Displays gross and net P&L, percentage returns, and remaining equity
 * across 21 price movements (-10% to +10%) for both LONG and SHORT positions.
 */
export function LeverageTable({ rows, leverage }: LeverageTableProps): React.JSX.Element {
  const margin = rows[0]?.margin ?? 0;
  const positionSize = rows[0]?.positionSize ?? margin * leverage;
  const entryPrice = rows[0]?.entryPrice ?? 0;

  return (
    <div className="w-full">
      {/* Header bar showing leverage tier summary */}
      <div className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs sm:text-sm font-mono border-b border-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1 select-none">
        <span>
          Leverage: <strong className="text-white font-semibold">{leverage}×</strong>
        </span>
        <span className="text-slate-600 hidden sm:inline">|</span>
        <span>
          Margin: <strong className="text-white font-semibold">{margin.toLocaleString()} USDT</strong>
        </span>
        <span className="text-slate-600 hidden sm:inline">|</span>
        <span>
          Position: <strong className="text-white font-semibold">{positionSize.toLocaleString()} USDT</strong>
        </span>
        <span className="text-slate-600 hidden sm:inline">|</span>
        <span>
          Entry: <strong className="text-white font-semibold">${formatBtcPrice(entryPrice)}</strong>
        </span>
      </div>

      {/* Scrollable scenario table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-700 text-slate-300 text-xs uppercase tracking-wider">
              <th scope="col" className="px-3 py-2 text-left whitespace-nowrap">Move %</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Exit Price</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">LONG P&L</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">LONG Return %</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">SHORT P&L</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">SHORT Return %</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Net P&L Long</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Net P&L Short</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Remaining Equity Long</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Remaining Equity Short</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                  No scenario data available.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isZeroMove = row.movePct === 0;
                const isEvenRow = idx % 2 === 0;

                const rowBg = isZeroMove
                  ? 'bg-slate-700/50 font-medium'
                  : isEvenRow
                  ? 'bg-slate-800/30'
                  : 'bg-transparent';

                const moveColorClass =
                  row.movePct > 0
                    ? 'text-green-400'
                    : row.movePct < 0
                    ? 'text-red-400'
                    : 'text-slate-300';

                return (
                  <tr
                    key={row.movePct}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${rowBg}`}
                  >
                    {/* 1. Move % */}
                    <td className={`px-3 py-2 text-left font-mono text-sm ${moveColorClass}`}>
                      {formatPercentage(row.movePct)}
                    </td>

                    {/* 2. Exit Price */}
                    <td className="px-3 py-2 text-right font-mono text-sm text-slate-200">
                      ${formatBtcPrice(row.exitPrice)}
                    </td>

                    {/* 3. LONG P&L */}
                    <td className={`px-3 py-2 text-right font-mono text-sm ${getPnlColorClass(row.longGrossPnl)}`}>
                      {formatCurrency(row.longGrossPnl)}
                    </td>

                    {/* 4. LONG Return % */}
                    <td className={`px-3 py-2 text-right font-mono text-sm ${getPnlColorClass(row.longReturnPct)}`}>
                      {formatPercentage(row.longReturnPct)}
                    </td>

                    {/* 5. SHORT P&L */}
                    <td className={`px-3 py-2 text-right font-mono text-sm ${getPnlColorClass(row.shortGrossPnl)}`}>
                      {formatCurrency(row.shortGrossPnl)}
                    </td>

                    {/* 6. SHORT Return % */}
                    <td className={`px-3 py-2 text-right font-mono text-sm ${getPnlColorClass(row.shortReturnPct)}`}>
                      {formatPercentage(row.shortReturnPct)}
                    </td>

                    {/* 7. Net P&L Long (after fees) */}
                    <td className={`px-3 py-2 text-right font-mono text-sm font-semibold ${getPnlColorClass(row.estNetPnlLong)}`}>
                      {formatCurrency(row.estNetPnlLong)}
                    </td>

                    {/* 8. Net P&L Short (after fees) */}
                    <td className={`px-3 py-2 text-right font-mono text-sm font-semibold ${getPnlColorClass(row.estNetPnlShort)}`}>
                      {formatCurrency(row.estNetPnlShort)}
                    </td>

                    {/* 9. Remaining Equity Long */}
                    <td className={`px-3 py-2 text-right font-mono text-sm ${row.remainingEquityLong <= 0 ? 'text-red-400 font-semibold' : 'text-slate-200'}`}>
                      {formatCurrency(row.remainingEquityLong)}
                    </td>

                    {/* 10. Remaining Equity Short */}
                    <td className={`px-3 py-2 text-right font-mono text-sm ${row.remainingEquityShort <= 0 ? 'text-red-400 font-semibold' : 'text-slate-200'}`}>
                      {formatCurrency(row.remainingEquityShort)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
