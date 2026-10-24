/**
 * React hook to manage live WebSocket streaming of candlesticks and mark prices
 * via the BinanceWebSocket manager.
 */

import { useEffect, useState } from 'react';
import { BinanceWebSocket } from '../api/binanceWebSocket';
import type {
  CandleData,
  CandleInterval,
  ConnectionStatus,
  MarkPriceInfo,
} from '../api/types';

export interface UseBinanceWebSocketResult {
  liveCandle: CandleData | null;
  markPrice: MarkPriceInfo | null;
  status: ConnectionStatus;
}

/**
 * Subscribes to live Binance WebSocket streams for real-time klines and mark price updates.
 * Automatically cleans up socket on unmount and transitions streams when symbol or interval changes.
 *
 * @param symbol - Trading pair symbol (e.g. 'BTCUSDT').
 * @param interval - Candlestick interval (e.g. '1m', '1h').
 * @returns Latest liveCandle, markPrice, and connection status.
 */
export function useBinanceWebSocket(
  symbol: string,
  interval: CandleInterval
): UseBinanceWebSocketResult {
  const [liveCandle, setLiveCandle] = useState<CandleData | null>(null);
  const [markPrice, setMarkPrice] = useState<MarkPriceInfo | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const wsManager = new BinanceWebSocket({
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
      onKlineUpdate: (candle) => {
        setLiveCandle(candle);
      },
      onMarkPriceUpdate: (price) => {
        setMarkPrice(price);
      },
    });

    wsManager.connect(symbol, interval);

    return () => {
      wsManager.disconnect();
      setLiveCandle(null);
      setMarkPrice(null);
      setStatus('disconnected');
    };
  }, [symbol, interval]);

  return {
    liveCandle,
    markPrice,
    status,
  };
}
