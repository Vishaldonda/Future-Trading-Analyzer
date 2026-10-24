/**
 * React hook to fetch and paginate historical candlestick (kline) data
 * from Binance Futures REST API.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchKlines } from '../api/binanceRest';
import type { CandleData, CandleInterval } from '../api/types';

export interface UseBinanceKlinesResult {
  data: CandleData[];
  loading: boolean;
  error: string | null;
  fetchMore: (direction: 'older' | 'newer') => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Fetches historical klines for a given symbol and interval, supporting
 * time-window filtering, infinite scrolling (fetchMore), and auto-cancellation.
 *
 * @param symbol - Trading pair symbol (e.g. 'BTCUSDT').
 * @param interval - Candlestick interval (e.g. '1m', '1h', '1d').
 * @param startTime - Optional start timestamp in milliseconds.
 * @param endTime - Optional end timestamp in milliseconds.
 * @returns Object with data, loading state, error, fetchMore, and refetch helpers.
 */
export function useBinanceKlines(
  symbol: string,
  interval: CandleInterval,
  startTime?: number,
  endTime?: number
): UseBinanceKlinesResult {
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Keep dataRef in sync via effect to avoid accessing ref during render
  const dataRef = useRef<CandleData[]>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const isFetchingMore = useRef<boolean>(false);
  const activeControllerRef = useRef<AbortController | null>(null);

  const loadKlines = useCallback(async () => {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const candles = await fetchKlines(symbol, interval, {
        startTime,
        endTime,
        limit: 500,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setData(candles);
        setLoading(false);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch candlestick data.';
      setError(message);
      setLoading(false);
    }
  }, [symbol, interval, startTime, endTime]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    activeControllerRef.current = controller;

    // Async fetch inside effect without synchronous setState
    void fetchKlines(symbol, interval, {
      startTime,
      endTime,
      limit: 500,
      signal: controller.signal,
    })
      .then((candles) => {
        if (!ignore && !controller.signal.aborted) {
          setData(candles);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore && !controller.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Failed to fetch candlestick data.';
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [symbol, interval, startTime, endTime]);

  /**
   * Loads older or newer candles and merges them into the current dataset.
   *
   * @param direction - 'older' to prepend candles prior to first candle,
   *                    'newer' to append candles following last candle.
   */
  const fetchMore = useCallback(
    async (direction: 'older' | 'newer') => {
      const currentData = dataRef.current;
      if (isFetchingMore.current || currentData.length === 0) {
        return;
      }

      isFetchingMore.current = true;

      try {
        if (direction === 'older') {
          const oldestTimeSec = currentData[0].time;
          // Query before oldest timestamp (convert sec to ms, subtract 1ms)
          const queryEndTime = oldestTimeSec * 1000 - 1;

          const olderCandles = await fetchKlines(symbol, interval, {
            endTime: queryEndTime,
            limit: 500,
          });

          if (olderCandles.length > 0) {
            setData((prev) => {
              const prevOldest = prev[0]?.time ?? 0;
              const uniqueNew = olderCandles.filter((c) => c.time < prevOldest);
              return [...uniqueNew, ...prev];
            });
          }
        } else {
          const newestTimeSec = currentData[currentData.length - 1].time;
          // Query after newest timestamp (convert sec to ms, add 1ms)
          const queryStartTime = newestTimeSec * 1000 + 1;

          const newerCandles = await fetchKlines(symbol, interval, {
            startTime: queryStartTime,
            limit: 500,
          });

          if (newerCandles.length > 0) {
            setData((prev) => {
              const prevNewest = prev[prev.length - 1]?.time ?? 0;
              const uniqueNew = newerCandles.filter((c) => c.time > prevNewest);
              return [...prev, ...uniqueNew];
            });
          }
        }
      } catch (err) {
        console.warn(`[useBinanceKlines] fetchMore (${direction}) error:`, err);
      } finally {
        isFetchingMore.current = false;
      }
    },
    [symbol, interval]
  );

  return {
    data,
    loading,
    error,
    fetchMore,
    refetch: loadKlines,
  };
}
