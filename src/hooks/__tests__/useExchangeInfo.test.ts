import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as restModule from '../../api/binanceRest';
import type { ExchangeSymbolInfo } from '../../api/types';
import { useExchangeInfo } from '../useExchangeInfo';

describe('useExchangeInfo', () => {
  const mockSymbols: ExchangeSymbolInfo[] = [
    {
      symbol: 'BTCUSDT',
      pair: 'BTCUSDT',
      contractType: 'PERPETUAL',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 3,
      maxLeverage: 125,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches exchange info on mount and caches it across renders', async () => {
    const fetchSpy = vi
      .spyOn(restModule, 'fetchExchangeInfo')
      .mockResolvedValue(mockSymbols);

    const { result } = renderHook(() => useExchangeInfo());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.symbols).toEqual(mockSymbols);
    expect(result.current.error).toBeNull();

    // Re-rendering or another hook instance should reuse the cached data
    const { result: secondHook } = renderHook(() => useExchangeInfo());
    expect(secondHook.current.symbols).toEqual(mockSymbols);
    expect(secondHook.current.loading).toBe(false);

    // Should only have called the API once due to session cache
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('handles fetch errors properly', async () => {
    // Note: cache was populated by previous test unless cleared, but let's test refetch error
    vi.spyOn(restModule, 'fetchExchangeInfo').mockRejectedValueOnce(
      new Error('API rate limit')
    );

    const { result } = renderHook(() => useExchangeInfo());

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBe('API rate limit');
  });
});
