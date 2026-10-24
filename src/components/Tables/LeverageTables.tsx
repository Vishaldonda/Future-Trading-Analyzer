import React, { useState, useMemo } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import { useScenarios } from '../../hooks/useScenarios';
import { LEVERAGE_LEVELS } from '../../utils/constants';
import { formatBtcPrice, formatCurrency, formatUsdt } from '../../utils/formatting';
import type { ScenarioRow } from '../../calculations/scenarios';
import { LeverageTable } from './LeverageTable';
import { CsvExport } from './CsvExport';

/**
 * Multi-table accordion container presenting scenario analysis across
 * leverage levels 1x through 10x (210 scenario computations in total).
 */
export function LeverageTables(): React.JSX.Element {
  const { state } = useTradingContext();
  const { allTables } = useScenarios(
    state.entryPrice,
    state.margin,
    state.leverage,
    state.feeConfig
  );

  // Default: first table (1x) expanded
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([1]));

  const toggleLeverage = (leverage: number) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(leverage)) {
        next.delete(leverage);
      } else {
        next.add(leverage);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedLevels(new Set(LEVERAGE_LEVELS));
  };

  const handleCollapseAll = () => {
    setExpandedLevels(new Set());
  };

  // Flatten all scenario rows across 1x to 10x for the combined export
  const allRows = useMemo(() => {
    const combined: ScenarioRow[] = [];
    for (const lev of LEVERAGE_LEVELS) {
      const rows = allTables.get(lev);
      if (rows) {
        combined.push(...rows);
      }
    }
    return combined;
  }, [allTables]);

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Top Header & Summary Stats */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Leverage Scenario Matrix</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              1× - 10×
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            10 leverage levels × 21 scenarios = 210 calculations
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-slate-300">
            <span>Symbol: <strong className="text-white">{state.symbol}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Margin: <strong className="text-white">{formatUsdt(state.margin)}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Entry: <strong className="text-white">${formatBtcPrice(state.entryPrice)}</strong></span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer select-none"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer select-none"
          >
            Collapse All
          </button>
          <CsvExport
            data={allRows}
            filename={`${state.symbol.toLowerCase()}-all-leverage-1x-10x-scenarios`}
            label="Export All as CSV"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
          />
        </div>
      </div>

      {/* Accordion List for 1x through 10x */}
      <div className="space-y-3">
        {LEVERAGE_LEVELS.map((lev) => {
          const rows = allTables.get(lev) ?? [];
          const isExpanded = expandedLevels.has(lev);
          const posSize = state.margin * lev;

          return (
            <div key={lev} className="overflow-hidden">
              {/* Accordion Header */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleLeverage(lev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleLeverage(lev);
                  }
                }}
                className={`flex items-center justify-between bg-slate-800 px-4 py-3 cursor-pointer hover:bg-slate-700/80 transition-colors border border-slate-700 ${
                  isExpanded ? 'rounded-t-lg' : 'rounded-lg'
                }`}
              >
                {/* Left side: Chevron + Level Info */}
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-base font-bold text-white">{lev}× Leverage</span>
                    <span className="text-slate-500 hidden sm:inline">•</span>
                    <span className="text-xs sm:text-sm text-slate-400 font-mono">
                      Position: {formatCurrency(posSize)}
                    </span>
                    <span className="text-slate-500 hidden sm:inline">•</span>
                    <span className="text-xs sm:text-sm text-slate-400 font-mono">
                      Margin: {formatUsdt(state.margin)}
                    </span>
                  </div>
                </div>

                {/* Right side: Individual Table CSV Export */}
                <div className="flex items-center gap-2">
                  <CsvExport
                    data={rows}
                    filename={`${state.symbol.toLowerCase()}-${lev}x-scenarios`}
                    label="Export CSV"
                  />
                </div>
              </div>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="overflow-x-auto bg-slate-900 rounded-b-lg border border-t-0 border-slate-700 shadow-inner">
                  <LeverageTable rows={rows} leverage={lev} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
