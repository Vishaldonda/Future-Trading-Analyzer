import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchExchangeInfo,
  fetchFundingRate,
  fetchKlines,
  fetchLeverageBrackets,
  fetchMarkPrice,
} from '../binanceRest';

describe('binanceRest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchKlines', () => {
    it('fetches and converts kline array to CandleData format with seconds timestamp', async () => {
      const mockRawKlines = [
        [
          1672531200000, // 0: openTime ms
          '16500.00', // 1: open
          '16600.00', // 2: high
          '16400.00', // 3: low
          '16550.00', // 4: close
          '1000.5', // 5: volume
          1672531259999, // 6: closeTime
          '16525000.0', // 7: quoteVolume
          500, // 8: trades
          '600.2', // 9: takerBuyVolume
          '9933300.0', // 10: takerBuyQuoteVolume
          '0', // 11: ignore
        ],
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockRawKlines), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchKlines('BTCUSDT', '1h', { limit: 100 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        time: 1672531200, // 1672531200000 / 1000
        open: 16500,
        high: 16600,
        low: 16400,
        close: 16550,
        volume: 1000.5,
        quoteVolume: 16525000,
        trades: 500,
        takerBuyVolume: 600.2,
        takerBuyQuoteVolume: 9933300,
      });
    });

    it('enforces limit caps between 1 and 1500 (default 500)', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      await fetchKlines('BTCUSDT', '15m');
      expect(fetchSpy.mock.calls[0][0]).toContain('limit=500');

      await fetchKlines('BTCUSDT', '15m', { limit: 3000 });
      expect(fetchSpy.mock.calls[1][0]).toContain('limit=1500');

      await fetchKlines('BTCUSDT', '15m', { limit: -5 });
      expect(fetchSpy.mock.calls[2][0]).toContain('limit=1');
    });

    it('logs warning when rate limit usage exceeds 80% of threshold', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-mbx-used-weight-1m': '1050', // > 960 (80% of 1200)
          },
        })
      );

      await fetchKlines('BTCUSDT', '1m');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('High rate limit usage')
      );
    });
  });

  describe('fetchExchangeInfo', () => {
    it('filters for perpetual USDT contracts and extracts symbol attributes', async () => {
      const mockExchangeInfo = {
        symbols: [
          {
            symbol: 'BTCUSDT',
            pair: 'BTCUSDT',
            contractType: 'PERPETUAL',
            status: 'TRADING',
            baseAsset: 'BTC',
            quoteAsset: 'USDT',
            pricePrecision: 2,
            quantityPrecision: 3,
            filters: [{ filterType: 'LEVERAGE', maxLeverage: 125 }],
          },
          {
            symbol: 'ETHUSDT_241227',
            pair: 'ETHUSDT',
            contractType: 'CURRENT_QUARTER',
            status: 'TRADING',
            baseAsset: 'ETH',
            quoteAsset: 'USDT',
            pricePrecision: 2,
            quantityPrecision: 3,
          },
          {
            symbol: 'BTCBUSD',
            pair: 'BTCBUSD',
            contractType: 'PERPETUAL',
            status: 'TRADING',
            baseAsset: 'BTC',
            quoteAsset: 'BUSD',
            pricePrecision: 2,
            quantityPrecision: 3,
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockExchangeInfo), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const symbols = await fetchExchangeInfo();

      expect(symbols).toHaveLength(1);
      expect(symbols[0]).toEqual({
        symbol: 'BTCUSDT',
        pair: 'BTCUSDT',
        contractType: 'PERPETUAL',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        pricePrecision: 2,
        quantityPrecision: 3,
        maxLeverage: 125,
      });
    });
  });

  describe('fetchLeverageBrackets', () => {
    it('fetches and maps maintenance margin brackets for a symbol', async () => {
      const mockBracketsResponse = [
        {
          symbol: 'BTCUSDT',
          brackets: [
            {
              bracket: 1,
              initialLeverage: 125,
              notionalCap: 50000,
              notionalFloor: 0,
              maintMarginRatio: 0.004,
              cum: 0,
            },
            {
              bracket: 2,
              initialLeverage: 100,
              notionalCap: 250000,
              notionalFloor: 50000,
              maintMarginRatio: 0.005,
              cum: 50,
            },
          ],
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockBracketsResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const brackets = await fetchLeverageBrackets('BTCUSDT');

      expect(brackets).toHaveLength(2);
      expect(brackets[0].bracket).toBe(1);
      expect(brackets[0].initialLeverage).toBe(125);
      expect(brackets[0].maintMarginRatio).toBe(0.004);
    });
  });

  describe('fetchFundingRate', () => {
    it('retrieves funding rate history', async () => {
      const mockFundingResponse = [
        {
          symbol: 'BTCUSDT',
          fundingRate: '0.00010000',
          fundingTime: 1672531200000,
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockFundingResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const rates = await fetchFundingRate('BTCUSDT', 1);

      expect(rates).toHaveLength(1);
      expect(rates[0]).toEqual({
        symbol: 'BTCUSDT',
        fundingRate: '0.00010000',
        fundingTime: 1672531200000,
      });
    });
  });

  describe('fetchMarkPrice', () => {
    it('retrieves current mark price and funding time', async () => {
      const mockPremiumResponse = {
        symbol: 'BTCUSDT',
        markPrice: '67500.50',
        indexPrice: '67490.20',
        lastFundingRate: '0.0001',
        nextFundingTime: 1672560000000,
        time: 1672531200000,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockPremiumResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchMarkPrice('BTCUSDT');

      expect(result.symbol).toBe('BTCUSDT');
      expect(result.markPrice).toBe('67500.50');
      expect(result.nextFundingTime).toBe(1672560000000);
    });
  });

  describe('error handling', () => {
    it('handles HTTP error with Binance error message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ code: -1121, msg: 'Invalid symbol.' }), {
          status: 400,
          statusText: 'Bad Request',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await expect(fetchMarkPrice('INVALID')).rejects.toThrow(
        /Binance API error \(400 Bad Request\) - Invalid symbol\. \(code: -1121\)/
      );
    });

    it('handles network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

      await expect(fetchMarkPrice('BTCUSDT')).rejects.toThrow(/Network error fetching/);
    });
  });
});
