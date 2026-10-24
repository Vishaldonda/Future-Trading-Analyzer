import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as restModule from '../../api/binanceRest';
import type { CandleData } from '../../api/types';
import { useBinanceKlines } from '../useBinanceKlines';

describe('useBinanceKlines', () => {
  const initialCandles: CandleData[] = [
    {
      time: 1000,
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: 10,
      quoteVolume: 1000,
      trades: 5,
      takerBuyVolume: 4,
      takerBuyQuoteVolume: 400,
    },
    {
      time: 2000,
      open: 105,
      high: 115,
      low: 100,
      close: 110,
      volume: 15,
      quoteVolume: 1600,
      trades: 8,
      takerBuyVolume: 7,
      takerBuyQuoteVolume: 750,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads klines on mount and updates state', async () => {
    vi.spyOn(restModule, 'fetchKlines').mockResolvedValueOnce(initialCandles);

    const { result } = renderHook(() => useBinanceKlines('BTCUSDT', '1h'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(initialCandles);
    expect(result.current.error).toBeNull();
  });

  it('loads older candles with fetchMore(older) and prepends to data', async () => {
    vi.spyOn(restModule, 'fetchKlines')
      .mockResolvedValueOnce(initialCandles)
      .mockResolvedValueOnce([
        {
          time: 500,
          open: 90,
          high: 100,
          low: 88,
          close: 100,
          volume: 8,
          quoteVolume: 750,
          trades: 4,
          takerBuyVolume: 3,
          takerBuyQuoteVolume: 280,
        },
      ]);

    const { result } = renderHook(() => useBinanceKlines('BTCUSDT', '1h'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.fetchMore('older');
    });

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[0].time).toBe(500);
    expect(result.current.data[1].time).toBe(1000);
  });

  it('loads newer candles with fetchMore(newer) and appends to data', async () => {
    vi.spyOn(restModule, 'fetchKlines')
      .mockResolvedValueOnce(initialCandles)
      .mockResolvedValueOnce([
        {
          time: 3000,
          open: 110,
          high: 120,
          low: 108,
          close: 118,
          volume: 20,
          quoteVolume: 2300,
          trades: 12,
          takerBuyVolume: 10,
          takerBuyQuoteVolume: 1150,
        },
      ]);

    const { result } = renderHook(() => useBinanceKlines('BTCUSDT', '1h'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.fetchMore('newer');
    });

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[2].time).toBe(3000);
  });

  it('handles fetch failure and exposes error message', async () => {
    vi.spyOn(restModule, 'fetchKlines').mockRejectedValueOnce(
      new Error('Failed to reach Binance')
    );

    const { result } = renderHook(() => useBinanceKlines('BTCUSDT', '1h'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to reach Binance');
    expect(result.current.data).toEqual([]);
  });
});
