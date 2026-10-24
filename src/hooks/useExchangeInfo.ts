/**
 * React hook to fetch and session-cache Binance Futures exchange information
 * for supported perpetual contracts.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchExchangeInfo } from '../api/binanceRest';
import type { ExchangeSymbolInfo } from '../api/types';

export interface UseExchangeInfoResult {
  symbols: ExchangeSymbolInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Module-level in-memory cache for the current browser session
let cachedSymbols: ExchangeSymbolInfo[] | null = null;
let inFlightPromise: Promise<ExchangeSymbolInfo[]> | null = null;

/**
 * Fetches exchange specifications for all perpetual USDT-margined contracts.
 * Caches the response in memory for the duration of the application session
 * to prevent redundant API calls.
 *
 * @returns Object with symbols array, loading flag, error status, and refetch method.
 */
export function useExchangeInfo(): UseExchangeInfoResult {
  const [symbols, setSymbols] = useState<ExchangeSymbolInfo[]>(cachedSymbols ?? []);
  const [loading, setLoading] = useState<boolean>(cachedSymbols === null);
  const [error, setError] = useState<string | null>(null);

  const loadExchangeInfo = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && cachedSymbols) {
      setSymbols(cachedSymbols);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!inFlightPromise || forceRefresh) {
        inFlightPromise = fetchExchangeInfo();
      }

      const result = await inFlightPromise;
      cachedSymbols = result;
      setSymbols(result);
      setLoading(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch exchange information.';
      setError(message);
      setLoading(false);
    } finally {
      inFlightPromise = null;
    }
  }, []);

  useEffect(() => {
    if (cachedSymbols) {
      return;
    }

    let ignore = false;
    if (!inFlightPromise) {
      inFlightPromise = fetchExchangeInfo();
    }

    void inFlightPromise
      .then((result) => {
        if (!ignore) {
          cachedSymbols = result;
          setSymbols(result);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          const message =
            err instanceof Error ? err.message : 'Failed to fetch exchange information.';
          setError(message);
          setLoading(false);
        }
      })
      .finally(() => {
        inFlightPromise = null;
      });

    return () => {
      ignore = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    await loadExchangeInfo(true);
  }, [loadExchangeInfo]);

  return {
    symbols,
    loading,
    error,
    refetch,
  };
}
