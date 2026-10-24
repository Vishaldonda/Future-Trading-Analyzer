import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  HistogramSeries,
  type UTCTimestamp,
  type Time,
} from 'lightweight-charts';
import type { CandleData } from '../../api/types';
import { useTradingContext } from '../../context/TradingContext';
import { calcGrossPnL, calcPositionSize } from '../../calculations/pnl';
import { LEVERAGE_LEVELS, PERCENTAGE_MOVES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatting';
import type { TradingState } from '../../context/types';

export interface AdditionalChartsProps {
  /** Candlestick historical dataset (defaults to state.candles from TradingContext) */
  candles?: CandleData[];
  /** Optional override for trading state; defaults to useTradingContext() */
  state?: TradingState;
  /** Optional container class name */
  className?: string;
}

type ChartTab = 'line' | 'volume' | 'priceChange' | 'sensitivity' | 'comparison';

const TABS: { id: ChartTab; label: string }[] = [
  { id: 'line', label: 'Line Chart' },
  { id: 'volume', label: 'Volume' },
  { id: 'priceChange', label: 'Price Change %' },
  { id: 'sensitivity', label: 'P&L Sensitivity' },
  { id: 'comparison', label: 'Long vs Short' },
];

const LEV_BASE_TIME = 1700000000;
const PCT_BASE_TIME = 1700000000;

/**
 * 1. Line Chart Sub-view (Closing prices only)
 */
function LineChartSubView({ candles }: { candles: CandleData[] }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
    });

    const series = chart.addSeries(LineSeries, {
      color: '#38bdf8',
      lineWidth: 2,
    });

    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const unique = sorted.filter((c, i) => i === 0 || c.time !== sorted[i - 1].time);
    series.setData(
      unique.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.close,
      }))
    );

    const observer = new ResizeObserver((entries) => {
      if (!entries?.[0]?.contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.resize(width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles]);

  return <div ref={containerRef} className="w-full h-[320px] min-h-[300px]" />;
}

/**
 * 2. Standalone Volume Histogram Sub-view
 */
function VolumeSubView({ candles }: { candles: CandleData[] }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
    });

    const series = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
    });

    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const unique = sorted.filter((c, i) => i === 0 || c.time !== sorted[i - 1].time);
    series.setData(
      unique.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? '#22c55e' : '#ef4444',
      }))
    );

    const observer = new ResizeObserver((entries) => {
      if (!entries?.[0]?.contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.resize(width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles]);

  return <div ref={containerRef} className="w-full h-[320px] min-h-[300px]" />;
}

/**
 * 3. Price Change % Sub-view (Percent change between consecutive closes)
 */
function PriceChangeSubView({ candles }: { candles: CandleData[] }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
    });

    const series = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'custom',
        formatter: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`,
      },
    });

    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const unique = sorted.filter((c, i) => i === 0 || c.time !== sorted[i - 1].time);

    const changeData = unique.map((c, i) => {
      const prev = unique[i - 1];
      const changePct =
        prev && prev.close > 0 ? ((c.close - prev.close) / prev.close) * 100 : 0;
      return {
        time: c.time as UTCTimestamp,
        value: Number(changePct.toFixed(2)),
        color: changePct >= 0 ? '#22c55e' : '#ef4444',
      };
    });

    series.setData(changeData);

    const observer = new ResizeObserver((entries) => {
      if (!entries?.[0]?.contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.resize(width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles]);

  return <div ref={containerRef} className="w-full h-[320px] min-h-[300px]" />;
}

/**
 * 4. P&L Sensitivity Sub-view (P&L across leverage 1x-10x for a fixed % move)
 */
function SensitivitySubView({
  margin,
  percentageMove,
}: {
  margin: number;
  percentageMove: number;
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      localization: {
        timeFormatter: (time: Time) => {
          const lev = Math.round((Number(time) - LEV_BASE_TIME) / 86400);
          return `${lev}x Leverage`;
        },
      },
      timeScale: {
        borderColor: '#334155',
        tickMarkFormatter: (time: Time) => {
          const lev = Math.round((Number(time) - LEV_BASE_TIME) / 86400);
          return `${lev}x`;
        },
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
    });

    const longSeries = chart.addSeries(LineSeries, {
      color: '#22c55e',
      lineWidth: 2,
      title: 'LONG',
    });

    const shortSeries = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 2,
      title: 'SHORT',
    });

    const longData = LEVERAGE_LEVELS.map((lev) => {
      const posSize = calcPositionSize(margin, lev);
      const pnl = calcGrossPnL(posSize, percentageMove, 'LONG');
      return {
        time: (LEV_BASE_TIME + lev * 86400) as UTCTimestamp,
        value: Number(pnl.toFixed(2)),
      };
    });

    const shortData = LEVERAGE_LEVELS.map((lev) => {
      const posSize = calcPositionSize(margin, lev);
      const pnl = calcGrossPnL(posSize, percentageMove, 'SHORT');
      return {
        time: (LEV_BASE_TIME + lev * 86400) as UTCTimestamp,
        value: Number(pnl.toFixed(2)),
      };
    });

    longSeries.setData(longData);
    shortSeries.setData(shortData);

    const observer = new ResizeObserver((entries) => {
      if (!entries?.[0]?.contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.resize(width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [margin, percentageMove]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-slate-300 font-medium">LONG P&L</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300 font-medium">SHORT P&L</span>
          </span>
        </div>
        <span>
          Simulating {percentageMove > 0 ? `+${percentageMove}` : percentageMove}% Move with{' '}
          {formatCurrency(margin)} Margin
        </span>
      </div>
      <div ref={containerRef} className="w-full h-[300px] min-h-[280px]" />
    </div>
  );
}

/**
 * 5. Long vs Short Comparison Sub-view (-10% to +10% price move comparison)
 */
function LongVsShortSubView({
  margin,
  leverage,
}: {
  margin: number;
  leverage: number;
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      localization: {
        timeFormatter: (time: Time) => {
          const pct = Math.round((Number(time) - PCT_BASE_TIME) / 86400) - 10;
          return `${pct > 0 ? `+${pct}` : pct}% Move`;
        },
      },
      timeScale: {
        borderColor: '#334155',
        tickMarkFormatter: (time: Time) => {
          const pct = Math.round((Number(time) - PCT_BASE_TIME) / 86400) - 10;
          return `${pct > 0 ? `+${pct}` : pct}%`;
        },
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
    });

    const longSeries = chart.addSeries(HistogramSeries, {
      color: '#22c55e',
      title: 'LONG',
    });

    const shortSeries = chart.addSeries(HistogramSeries, {
      color: '#ef4444',
      title: 'SHORT',
    });

    const positionSize = calcPositionSize(margin, leverage);

    const longData = PERCENTAGE_MOVES.map((pct) => {
      const pnl = calcGrossPnL(positionSize, pct, 'LONG');
      return {
        time: (PCT_BASE_TIME + (pct + 10) * 86400) as UTCTimestamp,
        value: Number(pnl.toFixed(2)),
      };
    });

    const shortData = PERCENTAGE_MOVES.map((pct) => {
      const pnl = calcGrossPnL(positionSize, pct, 'SHORT');
      return {
        time: (PCT_BASE_TIME + (pct + 10) * 86400) as UTCTimestamp,
        value: Number(pnl.toFixed(2)),
      };
    });

    longSeries.setData(longData);
    shortSeries.setData(shortData);

    const observer = new ResizeObserver((entries) => {
      if (!entries?.[0]?.contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) chart.resize(width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [margin, leverage]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-400 px-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-slate-300 font-medium">LONG P&L</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300 font-medium">SHORT P&L</span>
          </span>
        </div>
        <span>
          Settings: {formatCurrency(margin)} Margin @ {leverage}x Leverage
        </span>
      </div>
      <div ref={containerRef} className="w-full h-[300px] min-h-[280px]" />
    </div>
  );
}

/**
 * Tabbed panel offering alternative chart views:
 * - Line chart (closing prices only)
 * - Volume histogram (standalone)
 * - Price change % chart (percent change between consecutive closes)
 * - P&L sensitivity chart (P&L across leverage 1x-10x)
 * - Long vs Short comparison (-10% to +10% move comparison)
 */
export function AdditionalCharts({
  candles,
  state: propState,
  className = '',
}: AdditionalChartsProps): React.JSX.Element {
  const context = useTradingContext();
  const effectiveState = propState || context.state;
  const { margin, leverage, percentageMove } = effectiveState;
  const effectiveCandles = candles ?? context.state.candles ?? [];

  const [activeTab, setActiveTab] = useState<ChartTab>('line');

  const content = useMemo(() => {
    switch (activeTab) {
      case 'line':
        return <LineChartSubView candles={effectiveCandles} />;
      case 'volume':
        return <VolumeSubView candles={effectiveCandles} />;
      case 'priceChange':
        return <PriceChangeSubView candles={effectiveCandles} />;
      case 'sensitivity':
        return (
          <SensitivitySubView
            margin={margin}
            percentageMove={percentageMove}
          />
        );
      case 'comparison':
        return (
          <LongVsShortSubView
            margin={margin}
            leverage={leverage}
          />
        );
      default:
        return null;
    }
  }, [activeTab, effectiveCandles, margin, leverage, percentageMove]);

  return (
    <div
      className={`bg-slate-900 rounded-xl border border-slate-700 p-4 flex flex-col gap-4 shadow-xl ${className}`}
    >
      {/* Navigation Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-semibold text-slate-200">Alternative Analysis Views</h3>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Chart View Container (At least 300px tall) */}
      <div className="min-h-[300px] w-full">{content}</div>
    </div>
  );
}
