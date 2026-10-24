/**
 * Binance Futures Public REST API client module.
 *
 * Implements endpoints for historical klines, exchange specifications,
 * maintenance margin brackets, funding rates, and mark price index.
 * Routes through Vite dev proxy `/binance-api` by default.
 */

import type { MarginBracket } from '../calculations/liquidation';
import type {
  CandleData,
  CandleInterval,
  ExchangeSymbolInfo,
  FundingRateInfo,
  KlineFetchOptions,
  MarkPriceInfo,
} from './types';

/**
 * Base URL configured for the Binance Futures REST API.
 * Uses Vite proxy path in development to bypass CORS restrictions.
 */
export const API_BASE_URL = '/binance-api';

/**
 * Evaluates Binance rate limit response headers and outputs a warning
 * if used weight exceeds 80% of standard capacity.
 */
function checkRateLimits(response: Response): void {
  const usedWeightHeader =
    response.headers.get('x-mbx-used-weight-1m') ||
    response.headers.get('x-mbx-used-weight');

  if (usedWeightHeader) {
    const used = parseInt(usedWeightHeader, 10);
    // Default Binance Futures 1-minute weight limit threshold is 1200
    const limit = 1200;
    if (!Number.isNaN(used) && used >= limit * 0.8) {
      console.warn(
        `[Binance API Warning] High rate limit usage: ${used}/${limit} (>= 80%). Reduce request frequency to prevent 429 bans.`
      );
    }
  }
}

/**
 * Generic fetch wrapper handling query parameters, rate limit checks,
 * HTTP error statuses, and JSON parse failures.
 */
async function apiFetch<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal
): Promise<T> {
  const queryParts: string[] = [];

  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    }
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const url = `${API_BASE_URL}${endpoint}${queryString}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }
    throw new Error(
      `Network error fetching ${endpoint}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  checkRateLimits(response);

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      if (errJson && typeof errJson === 'object') {
        const msg = (errJson as { msg?: string }).msg;
        const code = (errJson as { code?: number }).code;
        errorDetail = msg ? ` - ${msg} (code: ${code})` : '';
      }
    } catch {
      // Body is not JSON
    }
    throw new Error(
      `Binance API error (${response.status} ${response.statusText})${errorDetail}`
    );
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON response from ${endpoint}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Fetches historical candlestick (kline) data from Binance Futures.
 *
 * @param symbol - Trading pair symbol (e.g. 'BTCUSDT').
 * @param interval - Candlestick interval (e.g. '1m', '1h', '1d').
 * @param options - Optional start/end times, limit (default 500, max 1500), and AbortSignal.
 * @returns Array of normalized CandleData sorted chronologically.
 */
export async function fetchKlines(
  symbol: string,
  interval: CandleInterval,
  options?: KlineFetchOptions
): Promise<CandleData[]> {
  const limit = Math.min(Math.max(1, options?.limit ?? 500), 1500);

  const raw = await apiFetch<(string | number)[][]>(
    '/fapi/v1/klines',
    {
      symbol: symbol.toUpperCase(),
      interval,
      startTime: options?.startTime,
      endTime: options?.endTime,
      limit,
    },
    options?.signal
  );

  if (!Array.isArray(raw)) {
    throw new Error(`Invalid klines response format for ${symbol}: expected an array.`);
  }

  return raw.map((item) => {
    const openTimeMs = Number(item[0]);
    return {
      // Convert openTime from milliseconds to seconds for TradingView Lightweight Charts
      time: Math.floor(openTimeMs / 1000),
      open: parseFloat(String(item[1])),
      high: parseFloat(String(item[2])),
      low: parseFloat(String(item[3])),
      close: parseFloat(String(item[4])),
      volume: parseFloat(String(item[5])),
      quoteVolume: parseFloat(String(item[7])),
      trades: Number(item[8]),
      takerBuyVolume: parseFloat(String(item[9])),
      takerBuyQuoteVolume: parseFloat(String(item[10])),
    };
  });
}

/**
 * Raw Binance ExchangeInfo symbol structure.
 */
interface RawExchangeSymbol {
  symbol: string;
  pair: string;
  contractType: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  filters?: Array<{
    filterType: string;
    maxLeverage?: number | string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface RawExchangeInfoResponse {
  symbols: RawExchangeSymbol[];
}

/**
 * Fetches exchange specifications for all perpetual USDT-margined futures symbols.
 *
 * @param signal - Optional AbortSignal for request cancellation.
 * @returns Array of ExchangeSymbolInfo containing contract parameters and precision rules.
 */
export async function fetchExchangeInfo(signal?: AbortSignal): Promise<ExchangeSymbolInfo[]> {
  const data = await apiFetch<RawExchangeInfoResponse>('/fapi/v1/exchangeInfo', undefined, signal);

  if (!data || !Array.isArray(data.symbols)) {
    throw new Error('Invalid exchangeInfo response: symbols list missing.');
  }

  return data.symbols
    .filter(
      (s) =>
        s.contractType === 'PERPETUAL' &&
        s.quoteAsset === 'USDT' &&
        s.status === 'TRADING'
    )
    .map((s) => {
      // Determine max leverage from filters or fallback tiers
      const leverageFilter = s.filters?.find(
        (f) => f.filterType === 'LEVERAGE' || f.filterType === 'MAX_LEVERAGE'
      );
      let maxLeverage = leverageFilter?.maxLeverage ? Number(leverageFilter.maxLeverage) : 0;

      if (!maxLeverage || Number.isNaN(maxLeverage) || maxLeverage <= 0) {
        if (s.symbol === 'BTCUSDT' || s.symbol === 'ETHUSDT') {
          maxLeverage = 125;
        } else if (
          ['SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT'].includes(s.symbol)
        ) {
          maxLeverage = 75;
        } else {
          maxLeverage = 50;
        }
      }

      return {
        symbol: s.symbol,
        pair: s.pair,
        contractType: s.contractType,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        pricePrecision: Number(s.pricePrecision),
        quantityPrecision: Number(s.quantityPrecision),
        maxLeverage,
      };
    });
}

/**
 * Raw Binance leverage bracket tier.
 */
interface RawMarginBracket {
  bracket: number | string;
  initialLeverage: number | string;
  notionalCap: number | string;
  notionalFloor: number | string;
  maintMarginRatio: number | string;
  cum: number | string;
}

interface RawSymbolBrackets {
  symbol?: string;
  brackets: RawMarginBracket[];
}

/**
 * Fetches tiered maintenance margin brackets for a specific symbol.
 *
 * @param symbol - Trading pair symbol (e.g. 'BTCUSDT').
 * @param signal - Optional AbortSignal for request cancellation.
 * @returns Array of MarginBracket objects ordered by tier.
 */
export async function fetchLeverageBrackets(
  symbol: string,
  signal?: AbortSignal
): Promise<MarginBracket[]> {
  const upper = symbol.toUpperCase();
  const data = await apiFetch<RawSymbolBrackets[] | RawSymbolBrackets>(
    '/fapi/v1/leverageBracket',
    { symbol: upper },
    signal
  );

  const list: RawSymbolBrackets[] = Array.isArray(data) ? data : [data];
  const target = list.find((item) => item?.symbol === upper) ?? list[0];

  if (!target || !Array.isArray(target.brackets)) {
    throw new Error(`Failed to extract leverage brackets for symbol ${symbol}.`);
  }

  return target.brackets.map((b) => ({
    bracket: Number(b.bracket),
    initialLeverage: Number(b.initialLeverage),
    notionalCap: Number(b.notionalCap),
    notionalFloor: Number(b.notionalFloor),
    maintMarginRatio: Number(b.maintMarginRatio),
    cum: Number(b.cum),
  }));
}

/**
 * Fetches recent funding rate history for a symbol.
 *
 * @param symbol - Trading pair symbol (e.g. 'BTCUSDT').
 * @param limit - Maximum records to retrieve (default: 100).
 * @param signal - Optional AbortSignal for request cancellation.
 * @returns Array of FundingRateInfo records.
 */
export async function fetchFundingRate(
  symbol: string,
  limit: number = 100,
  signal?: AbortSignal
): Promise<FundingRateInfo[]> {
  const raw = await apiFetch<Array<{ symbol: string; fundingRate: string; fundingTime: number | string }>>(
    '/fapi/v1/fundingRate',
    {
      symbol: symbol.toUpperCase(),
      limit,
    },
    signal
  );

  if (!Array.isArray(raw)) {
    throw new Error(`Invalid funding rate response for ${symbol}: expected an array.`);
  }

  return raw.map((item) => ({
    symbol: String(item.symbol),
    fundingRate: String(item.fundingRate),
    fundingTime: Number(item.fundingTime),
  }));
}

/**
 * Fetches current mark price, index price, and next funding settlement details.
 *
 * @param symbol - Trading pair symbol (e.g. 'BTCUSDT').
 * @param signal - Optional AbortSignal for request cancellation.
 * @returns Current MarkPriceInfo record.
 */
export async function fetchMarkPrice(
  symbol: string,
  signal?: AbortSignal
): Promise<MarkPriceInfo> {
  const data = await apiFetch<{
    symbol: string;
    markPrice: string;
    indexPrice: string;
    lastFundingRate: string;
    nextFundingTime: number | string;
    time: number | string;
  }>(
    '/fapi/v1/premiumIndex',
    {
      symbol: symbol.toUpperCase(),
    },
    signal
  );

  if (!data || !data.markPrice) {
    throw new Error(`Invalid mark price response for ${symbol}.`);
  }

  return {
    symbol: String(data.symbol),
    markPrice: String(data.markPrice),
    indexPrice: String(data.indexPrice),
    lastFundingRate: String(data.lastFundingRate),
    nextFundingTime: Number(data.nextFundingTime),
    time: Number(data.time),
  };
}
