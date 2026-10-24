import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type LogicalRange,
  type BarData,
} from 'lightweight-charts';
import type { CandleData, CandleInterval } from '../../api/types';
import { formatTimestamp, formatBtcPrice, formatCompact, formatVolume } from '../../utils/formatting';

export interface CandlestickChartProps {
  /** Array of historical candlestick data */
  candles: CandleData[];
  /** Latest active/forming candlestick from WebSocket */
  liveCandle: CandleData | null;
  /** Candlestick timeframe interval */
  interval: CandleInterval;
  /** IANA timezone identifier for display */
  timezone: string;
  /** Callback fired when user pans towards the left edge to fetch older candles */
  onLoadMore: () => void;
  /** Optional callback fired on crosshair move with the hovered close price */
  onCrosshairMove?: (price: number | null) => void;
  /** Optional callback when chart and candlestick series instances are initialized */
  onChartReady?: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void;
  /** Optional custom container CSS classes */
  className?: string;
}

interface TooltipState {
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  isUp: boolean;
  left: number;
  top: number;
}

const SHORT_INTERVALS: readonly CandleInterval[] = ['1m', '3m', '5m', '15m', '30m'] as const;

/**
 * CandlestickChart component that embeds a TradingView Lightweight Chart instance.
 * Features dark theme styling, volume histogram overlay, responsive resizing,
 * live candle updates, and interactive OHLCV crosshair tooltip.
 */
export function CandlestickChart({
  candles,
  liveCandle,
  interval,
  timezone,
  onLoadMore,
  onCrosshairMove,
  onChartReady,
  className = '',
}: CandlestickChartProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Fast O(1) map for lookup during crosshair hover
  const candleMapRef = useRef<Map<number, CandleData>>(new Map());

  // Stable callback refs to prevent unnecessary re-subscriptions
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const onCrosshairMoveRef = useRef(onCrosshairMove);
  useEffect(() => {
    onCrosshairMoveRef.current = onCrosshairMove;
  }, [onCrosshairMove]);

  const timezoneRef = useRef(timezone);
  useEffect(() => {
    timezoneRef.current = timezone;
  }, [timezone]);

  const onChartReadyRef = useRef(onChartReady);
  useEffect(() => {
    onChartReadyRef.current = onChartReady;
  }, [onChartReady]);

  const lastLoadMoreTimeRef = useRef<number>(0);

  // Determine if seconds should be visible on the time scale
  const secondsVisible = useMemo(() => {
    return SHORT_INTERVALS.includes(interval);
  }, [interval]);

  const initialIntervalRef = useRef(interval);

  // 1. Initialize Lightweight Chart instance
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 500,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: SHORT_INTERVALS.includes(initialIntervalRef.current),
      },
    });

    // Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
    });

    // Volume Histogram Series on overlay scale
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Notify parent of ready instances
    onChartReadyRef.current?.(chart, candlestickSeries);

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      const el = containerRef.current;
      if (
        !el ||
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > el.clientWidth ||
        param.point.y < 0 ||
        param.point.y > el.clientHeight
      ) {
        setTooltip(null);
        onCrosshairMoveRef.current?.(null);
        return;
      }

      const timestamp = param.time as number;
      const candle = candleMapRef.current.get(timestamp);
      const barData = param.seriesData.get(candlestickSeries) as BarData | undefined;

      const containerWidth = el.clientWidth || 800;
      const containerHeight = el.clientHeight || 500;
      const boxWidth = 200;
      const boxHeight = 130;

      let left = param.point.x + 16;
      if (left + boxWidth > containerWidth - 12) {
        left = Math.max(12, param.point.x - boxWidth - 16);
      }

      let top = param.point.y - 30;
      if (top + boxHeight > containerHeight - 12) {
        top = Math.max(12, containerHeight - boxHeight - 12);
      }
      if (top < 12) {
        top = 12;
      }

      if (candle) {
        onCrosshairMoveRef.current?.(candle.close);
        const isUp = candle.close >= candle.open;
        setTooltip({
          timeStr: formatTimestamp(candle.time, timezoneRef.current),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          quoteVolume: candle.quoteVolume,
          trades: candle.trades,
          isUp,
          left,
          top,
        });
      } else if (barData && 'close' in barData) {
        onCrosshairMoveRef.current?.(barData.close);
        const isUp = barData.close >= barData.open;
        setTooltip({
          timeStr: formatTimestamp(timestamp, timezoneRef.current),
          open: barData.open,
          high: barData.high,
          low: barData.low,
          close: barData.close,
          volume: 0,
          quoteVolume: 0,
          trades: 0,
          isUp,
          left,
          top,
        });
      } else {
        setTooltip(null);
        onCrosshairMoveRef.current?.(null);
      }
    });

    // Historical pagination handler
    const handleRangeChange = (newRange: LogicalRange | null) => {
      if (!newRange) return;
      if (newRange.from < 10) {
        const now = Date.now();
        if (now - lastLoadMoreTimeRef.current > 800) {
          lastLoadMoreTimeRef.current = now;
          onLoadMoreRef.current();
        }
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    // Responsive resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chartRef.current.resize(width, height);
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []); // Run once on mount

  // 2. Update time scale options when interval changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      timeScale: {
        secondsVisible,
      },
    });
  }, [secondsVisible]);

  // 3. Set historical data when candles array updates
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) {
      return;
    }

    // Deduplicate and sort candles by ascending timestamp
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const uniqueCandles: CandleData[] = [];
    const map = new Map<number, CandleData>();

    for (const c of sorted) {
      if (!map.has(c.time)) {
        map.set(c.time, c);
        uniqueCandles.push(c);
      }
    }
    candleMapRef.current = map;

    candlestickSeriesRef.current.setData(
      uniqueCandles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    volumeSeriesRef.current.setData(
      uniqueCandles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? '#22c55e88' : '#ef444488',
      }))
    );
  }, [candles]);

  // 4. Update the latest forming candle in real-time
  useEffect(() => {
    if (!liveCandle || !candlestickSeriesRef.current || !volumeSeriesRef.current) {
      return;
    }

    candlestickSeriesRef.current.update({
      time: liveCandle.time as UTCTimestamp,
      open: liveCandle.open,
      high: liveCandle.high,
      low: liveCandle.low,
      close: liveCandle.close,
    });

    volumeSeriesRef.current.update({
      time: liveCandle.time as UTCTimestamp,
      value: liveCandle.volume,
      color: liveCandle.close >= liveCandle.open ? '#22c55e88' : '#ef444488',
    });

    candleMapRef.current.set(liveCandle.time, liveCandle);
  }, [liveCandle]);

  return (
    <div className={`relative w-full h-full min-h-[450px] ${className}`}>
      {/* Chart Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Interactive OHLCV Tooltip */}
      {tooltip && (
        <div
          className="bg-slate-800/95 border border-slate-700 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-lg absolute z-20 backdrop-blur-sm transition-all duration-75 select-none"
          style={{
            left: `${tooltip.left}px`,
            top: `${tooltip.top}px`,
          }}
        >
          <div className="font-semibold text-slate-200 mb-1 border-b border-slate-700/80 pb-1">
            {tooltip.timeStr}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <div>
              <span className="text-slate-400">O: </span>
              <span className="text-slate-200 font-mono">{formatBtcPrice(tooltip.open)}</span>
            </div>
            <div>
              <span className="text-slate-400">H: </span>
              <span className="text-slate-200 font-mono">{formatBtcPrice(tooltip.high)}</span>
            </div>
            <div>
              <span className="text-slate-400">L: </span>
              <span className="text-slate-200 font-mono">{formatBtcPrice(tooltip.low)}</span>
            </div>
            <div>
              <span className="text-slate-400">C: </span>
              <span
                className={`font-mono font-semibold ${
                  tooltip.isUp ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatBtcPrice(tooltip.close)}
              </span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-700/60 mt-1 flex justify-between gap-2">
              <div>
                <span className="text-slate-400">Vol: </span>
                <span className="text-slate-200 font-mono">{formatVolume(tooltip.volume)}</span>
              </div>
              <div>
                <span className="text-slate-400">Quote: </span>
                <span className="text-slate-200 font-mono">${formatCompact(tooltip.quoteVolume)}</span>
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Trades: </span>
              <span className="text-slate-200 font-mono">{tooltip.trades.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
