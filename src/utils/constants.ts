/**
 * Application-wide default configuration values and constants
 * for the Crypto Futures Trading Analyzer.
 */

/** Default trading pair symbol */
export const DEFAULT_SYMBOL = 'BTCUSDT';

/** Default initial margin in USDT */
export const DEFAULT_MARGIN = 10;

/** Default leverage multiplier (10x) */
export const DEFAULT_LEVERAGE = 10;

/** Default reference entry price in USDT */
export const DEFAULT_ENTRY_PRICE = 80000;

/** Default position direction */
export const DEFAULT_DIRECTION = 'LONG' as const;

/** Default margin mode */
export const DEFAULT_MARGIN_MODE = 'isolated' as const;

/** Default candlestick chart interval */
export const DEFAULT_INTERVAL = '1h' as const;

/** Supported candlestick timeframes for historical and live chart data */
export const CANDLE_INTERVALS = [
  { value: '1m', label: '1 Minute' },
  { value: '3m', label: '3 Minutes' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '2h', label: '2 Hours' },
  { value: '4h', label: '4 Hours' },
  { value: '6h', label: '6 Hours' },
  { value: '8h', label: '8 Hours' },
  { value: '12h', label: '12 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '3d', label: '3 Days' },
  { value: '1w', label: '1 Week' },
  { value: '1M', label: '1 Month' },
] as const;

/** Standard leverage tiers for multi-table comparison (1x to 10x) */
export const LEVERAGE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Standard percentage move steps for scenario simulations (-10% to +10%) */
export const PERCENTAGE_MOVES = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Maximum allowable leverage supported on Binance Futures */
export const MAX_LEVERAGE = 125;

/** Mandatory regulatory and educational disclaimer notice */
export const DISCLAIMER_TEXT =
  'This tool is for educational and analysis purposes only. It does not predict future prices, recommend trades, or execute transactions. Liquidation estimates are approximate. Always verify with the exchange.';

export type CandleIntervalValue = typeof CANDLE_INTERVALS[number]['value'];
export type LeverageLevel = typeof LEVERAGE_LEVELS[number];
export type PercentageMove = typeof PERCENTAGE_MOVES[number];
