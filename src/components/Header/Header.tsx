import React, { useEffect, useRef, useState } from 'react';
import { useTradingContext } from '../../context/TradingContext';
import { formatBtcPrice } from '../../utils/formatting';
import type { ConnectionStatus } from '../../api/types';

/**
 * Top application header containing symbol switcher, live mark price ticker with
 * direction coloring and flash animation, WebSocket connection indicator, and disclaimer.
 */
export function Header(): React.JSX.Element {
  const { state, dispatch } = useTradingContext();
  const { symbol, availableSymbols, markPrice, connectionStatus } = state;

  const [priceTrend, setPriceTrend] = useState<'up' | 'down' | 'same'>('same');
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const prevPriceRef = useRef<number | null>(markPrice);

  useEffect(() => {
    if (markPrice === null) {
      return;
    }

    if (prevPriceRef.current !== null && prevPriceRef.current !== markPrice) {
      const nextTrend = markPrice > prevPriceRef.current ? 'up' : 'down';
      setPriceTrend(nextTrend);
      setIsFlashing(true);

      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, 600);

      prevPriceRef.current = markPrice;
      return () => clearTimeout(timer);
    }

    prevPriceRef.current = markPrice;
  }, [markPrice]);

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'SET_SYMBOL', payload: e.target.value });
  };

  const renderConnectionBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        );
      case 'reconnecting':
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Reconnecting
          </span>
        );
      case 'disconnected':
      case 'error':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Disconnected
          </span>
        );
    }
  };

  const hasSymbols = availableSymbols && availableSymbols.length > 0;
  const symbolExists = hasSymbols && availableSymbols.some((s) => s.symbol === symbol);

  // Derive price color and flash classes
  let priceColorClass = 'text-slate-200';
  let flashBgClass = 'bg-slate-700/50';

  if (priceTrend === 'up') {
    priceColorClass = 'text-emerald-400';
    flashBgClass = isFlashing ? 'bg-emerald-500/20' : 'bg-slate-700/50';
  } else if (priceTrend === 'down') {
    priceColorClass = 'text-rose-400';
    flashBgClass = isFlashing ? 'bg-rose-500/20' : 'bg-slate-700/50';
  }

  return (
    <header className="flex items-center justify-between bg-slate-800 border-b border-slate-700 px-6 py-3">
      {/* Left: App Title & Pair Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Future Trading Analyzer
          </h1>
        </div>

        {/* Symbol Selector Dropdown */}
        <div className="relative">
          <select
            value={symbol}
            onChange={handleSymbolChange}
            aria-label="Select trading pair"
            className="bg-slate-700 hover:bg-slate-650 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-colors"
          >
            {!symbolExists && <option value={symbol}>{symbol}</option>}
            {hasSymbols &&
              availableSymbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} ({s.quoteAsset})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Center: Live Mark Price Display */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors duration-300 ${flashBgClass}`}
        >
          <span className="text-xs uppercase font-medium text-slate-400">Mark:</span>
          <span className={`text-base font-bold font-mono transition-colors ${priceColorClass}`}>
            {markPrice !== null ? `$${formatBtcPrice(markPrice)}` : 'Loading...'}
          </span>
          {priceTrend === 'up' && (
            <span className="text-emerald-400 text-xs font-bold" aria-label="Price up">
              ▲
            </span>
          )}
          {priceTrend === 'down' && (
            <span className="text-rose-400 text-xs font-bold" aria-label="Price down">
              ▼
            </span>
          )}
        </div>
      </div>

      {/* Right: Connection Status & Disclaimer */}
      <div className="flex items-center gap-4">
        {renderConnectionBadge(connectionStatus)}
        <span className="hidden md:inline-block text-xs text-slate-500 border-l border-slate-700 pl-4">
          For analysis only. Not financial advice.
        </span>
      </div>
    </header>
  );
}
