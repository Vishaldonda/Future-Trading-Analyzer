/**
 * Global state and action type definitions for the Crypto Futures Trading Analyzer.
 */

import type { CandleInterval, ConnectionStatus, CandleData, MarkPriceInfo, ExchangeSymbolInfo } from '../api/types';
import type { FeeConfig } from '../calculations/fees';
import type { ScenarioRow } from '../calculations/scenarios';

export type { ScenarioRow, MarkPriceInfo };

export type Direction = 'LONG' | 'SHORT';
export type MarginMode = 'isolated' | 'cross';

export interface TradingState {
  // Market
  symbol: string;
  interval: CandleInterval;
  timezone: string;

  // Trading inputs
  margin: number;
  leverage: number;
  direction: Direction;
  entryPrice: number;
  percentageMove: number;
  marginMode: MarginMode;
  feeConfig: FeeConfig;

  // Market data
  candles: CandleData[];
  liveCandle: CandleData | null;
  markPrice: number | null;
  connectionStatus: ConnectionStatus;
  availableSymbols: ExchangeSymbolInfo[];

  // UI state
  isLoading: boolean;
  error: string | null;
  activeTab: 'chart' | 'tables' | 'playground' | 'views';
  enabledPriceLines: number[]; // which % lines are visible
}

export type TradingAction =
  | { type: 'SET_SYMBOL'; payload: string }
  | { type: 'SET_INTERVAL'; payload: CandleInterval }
  | { type: 'SET_TIMEZONE'; payload: string }
  | { type: 'SET_MARGIN'; payload: number }
  | { type: 'SET_LEVERAGE'; payload: number }
  | { type: 'SET_DIRECTION'; payload: Direction }
  | { type: 'SET_ENTRY_PRICE'; payload: number }
  | { type: 'SET_PERCENTAGE_MOVE'; payload: number }
  | { type: 'SET_MARGIN_MODE'; payload: MarginMode }
  | { type: 'SET_FEE_CONFIG'; payload: FeeConfig }
  | { type: 'SET_CANDLES'; payload: CandleData[] }
  | { type: 'APPEND_CANDLES'; payload: { candles: CandleData[]; direction: 'prepend' | 'append' } }
  | { type: 'UPDATE_LIVE_CANDLE'; payload: CandleData }
  | { type: 'SET_MARK_PRICE'; payload: number }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_AVAILABLE_SYMBOLS'; payload: ExchangeSymbolInfo[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACTIVE_TAB'; payload: TradingState['activeTab'] }
  | { type: 'TOGGLE_PRICE_LINE'; payload: number }
  | { type: 'RESET_DEFAULTS' };
