/**
 * TypeScript type definitions for Binance Futures API responses and WebSocket streams.
 */

/**
 * Raw Binance Kline structure as parsed from Binance REST array response.
 */
export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

/**
 * Normalized candlestick data formatted for TradingView Lightweight Charts
 * and application-wide market data analysis.
 */
export interface CandleData {
  /** UTC timestamp in seconds */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  takerBuyVolume: number;
  takerBuyQuoteVolume: number;
}

/**
 * Supported Binance Futures candlestick intervals.
 */
export type CandleInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

/**
 * Trading symbol specification extracted from Binance Futures exchangeInfo.
 */
export interface ExchangeSymbolInfo {
  symbol: string;
  pair: string;
  contractType: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  maxLeverage: number;
}

/**
 * Historical or latest funding rate record.
 */
export interface FundingRateInfo {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

/**
 * Mark price, index price, and next funding settlement info from premiumIndex.
 */
export interface MarkPriceInfo {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  time: number;
}

/**
 * Live WebSocket connection states.
 */
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

/**
 * Options when requesting historical klines.
 */
export interface KlineFetchOptions {
  startTime?: number;
  endTime?: number;
  limit?: number;
  signal?: AbortSignal;
}

/**
 * Internal raw WebSocket kline payload inside combined stream.
 */
export interface BinanceWsKlinePayload {
  t: number; // Kline start time (ms)
  T: number; // Kline close time (ms)
  s: string; // Symbol
  i: string; // Interval
  f: number; // First trade ID
  L: number; // Last trade ID
  o: string; // Open price
  c: string; // Close price
  h: string; // High price
  l: string; // Low price
  v: string; // Base asset volume
  n: number; // Number of trades
  x: boolean; // Is this kline closed?
  q: string; // Quote asset volume
  V: string; // Taker buy base asset volume
  Q: string; // Taker buy quote asset volume
  B: string; // Ignore
}

/**
 * Raw WebSocket kline event payload.
 */
export interface BinanceWsKlineEvent {
  e: 'kline';
  E: number;
  s: string;
  k: BinanceWsKlinePayload;
}

/**
 * Raw WebSocket mark price update event payload.
 */
export interface BinanceWsMarkPriceEvent {
  e: 'markPriceUpdate';
  E: number;
  s: string;
  p: string; // Mark price
  i: string; // Index price
  P: string; // Estimated settle price
  r: string; // Funding rate
  T: number; // Next funding time
}

/**
 * Combined stream envelope wrapper.
 */
export interface BinanceWsCombinedMessage<T = unknown> {
  stream: string;
  data: T;
}
