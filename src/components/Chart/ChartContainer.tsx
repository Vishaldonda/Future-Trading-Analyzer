import { useState, useEffect, useMemo } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useTradingContext } from '../../context/TradingContext';
import { useBinanceKlines } from '../../hooks/useBinanceKlines';
import { useBinanceWebSocket } from '../../hooks/useBinanceWebSocket';
import { ChartControls } from './ChartControls';
import { CandlestickChart } from './CandlestickChart';
import { PriceLines } from './PriceLines';

export interface ChartContainerProps {
  /** Optional container class name */
  className?: string;
}

/**
 * Main chart container composing ChartControls, CandlestickChart, and PriceLines.
 * Coordinates historical candlestick fetching via REST and real-time live data via WebSocket,
 * updating the global TradingContext.
 */
export function ChartContainer({ className = '' }: ChartContainerProps): React.JSX.Element {
  const { state, dispatch } = useTradingContext();
  const {
    symbol,
    interval,
    timezone,
    entryPrice,
    margin,
    leverage,
    direction,
    enabledPriceLines,
    candles: contextCandles,
    liveCandle: contextLiveCandle,
  } = state;

  // 1. Historical Klines REST Hook
  const {
    data: klinesData,
    loading: klinesLoading,
    error: klinesError,
    fetchMore,
    refetch,
  } = useBinanceKlines(symbol, interval);

  // 2. Live WebSocket Hook
  const {
    liveCandle: wsLiveCandle,
    markPrice: wsMarkPrice,
    status: wsStatus,
  } = useBinanceWebSocket(symbol, interval);

  // Chart instance states for PriceLines overlay
  const [chartApi, setChartApi] = useState<IChartApi | null>(null);
  const [seriesApi, setSeriesApi] = useState<ISeriesApi<'Candlestick'> | null>(null);

  // 3. Synchronize REST historical data into context
  useEffect(() => {
    if (klinesData.length > 0) {
      dispatch({ type: 'SET_CANDLES', payload: klinesData });
    }
  }, [klinesData, dispatch]);

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: klinesLoading });
  }, [klinesLoading, dispatch]);

  useEffect(() => {
    if (klinesError) {
      dispatch({ type: 'SET_ERROR', payload: klinesError });
    }
  }, [klinesError, dispatch]);

  // 4. Synchronize WebSocket live updates into context
  useEffect(() => {
    if (wsLiveCandle) {
      dispatch({ type: 'UPDATE_LIVE_CANDLE', payload: wsLiveCandle });
    }
  }, [wsLiveCandle, dispatch]);

  useEffect(() => {
    if (wsMarkPrice?.markPrice) {
      const parsedPrice = parseFloat(wsMarkPrice.markPrice);
      if (!Number.isNaN(parsedPrice)) {
        dispatch({ type: 'SET_MARK_PRICE', payload: parsedPrice });
      }
    }
  }, [wsMarkPrice, dispatch]);

  useEffect(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: wsStatus });
  }, [wsStatus, dispatch]);

  // Determine effective candles (prefer klinesData or contextCandles)
  const effectiveCandles = useMemo(() => {
    return klinesData.length > 0 ? klinesData : contextCandles;
  }, [klinesData, contextCandles]);

  const effectiveLiveCandle = wsLiveCandle || contextLiveCandle;

  return (
    <div
      className={`bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex flex-col min-h-[500px] shadow-xl ${className}`}
    >
      {/* Top Controls Toolbar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/90">
        <ChartControls />
      </div>

      {/* Error Notification Banner if REST fetch fails */}
      {klinesError && (
        <div className="mx-3 mt-3 px-4 py-2.5 bg-red-900/40 border border-red-700/60 rounded-lg flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{klinesError}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-2.5 py-1 bg-red-800/80 hover:bg-red-700 text-white rounded text-xs font-medium transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Chart Workspace Area */}
      <div className="relative flex-1 w-full min-h-[450px]">
        {/* Initial Loading Spinner */}
        {klinesLoading && effectiveCandles.length === 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs gap-3">
            <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-slate-400">
              Loading {symbol} candlestick data...
            </span>
          </div>
        )}

        {/* Lightweight Candlestick Chart */}
        <CandlestickChart
          candles={effectiveCandles}
          liveCandle={effectiveLiveCandle}
          interval={interval}
          timezone={timezone}
          onLoadMore={() => void fetchMore('older')}
          onChartReady={(chart, series) => {
            setChartApi(chart);
            setSeriesApi(series);
          }}
          className="w-full h-full"
        />

        {/* Imperative Price Lines Overlay */}
        <PriceLines
          chart={chartApi}
          series={seriesApi}
          entryPrice={entryPrice}
          margin={margin}
          leverage={leverage}
          direction={direction}
          enabledLines={enabledPriceLines}
        />
      </div>
    </div>
  );
}
