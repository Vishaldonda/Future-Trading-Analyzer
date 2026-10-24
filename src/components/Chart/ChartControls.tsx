import React from 'react';
import { useTradingContext } from '../../context/TradingContext';
import { CANDLE_INTERVALS } from '../../utils/constants';
import { TIMEZONES } from '../../utils/timezone';
import { formatCurrency } from '../../utils/formatting';
import type { CandleInterval, ConnectionStatus } from '../../api/types';

export interface ChartControlsProps {
  /** Optional container class name */
  className?: string;
}

/**
 * Toolbar displayed above the candlestick chart with timeframe interval selector,
 * display timezone selector, live connection status badge, and market info.
 */
export function ChartControls({ className = '' }: ChartControlsProps): React.JSX.Element {
  const { state, dispatch } = useTradingContext();
  const { interval, timezone, connectionStatus, symbol, markPrice } = state;

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      type: 'SET_INTERVAL',
      payload: e.target.value as CandleInterval,
    });
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      type: 'SET_TIMEZONE',
      payload: e.target.value,
    });
  };

  const getConnectionConfig = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          dotClass: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]',
          label: 'Live',
          textClass: 'text-green-400',
        };
      case 'connecting':
        return {
          dotClass: 'bg-yellow-400 animate-pulse',
          label: 'Connecting',
          textClass: 'text-yellow-400',
        };
      case 'reconnecting':
        return {
          dotClass: 'bg-yellow-400 animate-pulse',
          label: 'Reconnecting',
          textClass: 'text-yellow-400',
        };
      case 'error':
        return {
          dotClass: 'bg-red-500',
          label: 'Error',
          textClass: 'text-red-400',
        };
      case 'disconnected':
      default:
        return {
          dotClass: 'bg-red-500',
          label: 'Disconnected',
          textClass: 'text-red-400',
        };
    }
  };

  const statusConfig = getConnectionConfig(connectionStatus);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 bg-slate-800 rounded-lg px-4 py-2 ${className}`}
    >
      {/* Left side: Symbol & Live Price */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-base tracking-wide">{symbol}</span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
            Perpetual
          </span>
        </div>

        {markPrice !== null && markPrice > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-700">
            <span className="text-xs text-slate-400">Mark:</span>
            <span className="text-sm font-semibold font-mono text-slate-100">
              {formatCurrency(markPrice)}
            </span>
          </div>
        )}
      </div>

      {/* Right side: Interval, Timezone, and Connection Status Indicator */}
      <div className="flex items-center gap-3">
        {/* Interval Dropdown */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="chart-interval-select" className="text-xs text-slate-400 hidden md:inline">
            Interval:
          </label>
          <select
            id="chart-interval-select"
            aria-label="Candlestick interval"
            value={interval}
            onChange={handleIntervalChange}
            className="bg-slate-700 text-slate-200 border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {CANDLE_INTERVALS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.value} ({item.label})
              </option>
            ))}
          </select>
        </div>

        {/* Timezone Dropdown */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="chart-timezone-select" className="text-xs text-slate-400 hidden lg:inline">
            Timezone:
          </label>
          <select
            id="chart-timezone-select"
            aria-label="Chart display timezone"
            value={timezone}
            onChange={handleTimezoneChange}
            className="bg-slate-700 text-slate-200 border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[150px] sm:max-w-none truncate"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live WebSocket Status Dot */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/60 border border-slate-700/60"
          title={`WebSocket Status: ${connectionStatus}`}
        >
          <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
          <span className={`text-xs font-medium ${statusConfig.textClass}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
}
