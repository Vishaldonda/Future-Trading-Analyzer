/**
 * Global application state provider and reducer for the Crypto Futures Trading Analyzer.
 */

import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { TradingState, TradingAction } from './types';
import {
  DEFAULT_SYMBOL,
  DEFAULT_MARGIN,
  DEFAULT_LEVERAGE,
  DEFAULT_ENTRY_PRICE,
  DEFAULT_DIRECTION,
  DEFAULT_MARGIN_MODE,
  DEFAULT_INTERVAL,
  PERCENTAGE_MOVES,
} from '../utils/constants';
import { getLocalTimezone } from '../utils/timezone';
import { DEFAULT_FEE_CONFIG } from '../calculations/fees';
import type { CandleData } from '../api/types';

/**
 * Initial application state with sensible defaults.
 */
export const initialState: TradingState = {
  symbol: DEFAULT_SYMBOL,
  interval: DEFAULT_INTERVAL,
  timezone: getLocalTimezone(),
  margin: DEFAULT_MARGIN,
  leverage: DEFAULT_LEVERAGE,
  direction: DEFAULT_DIRECTION,
  entryPrice: DEFAULT_ENTRY_PRICE,
  percentageMove: 1,
  marginMode: DEFAULT_MARGIN_MODE,
  feeConfig: DEFAULT_FEE_CONFIG,
  candles: [],
  liveCandle: null,
  markPrice: null,
  connectionStatus: 'disconnected',
  availableSymbols: [],
  isLoading: false,
  error: null,
  activeTab: 'chart',
  enabledPriceLines: [...PERCENTAGE_MOVES].filter((p) => p !== 0),
};

/**
 * Reducer function for managing TradingState transitions.
 * Pure function handling all trading inputs, market data updates, and UI actions.
 *
 * @param state - Current trading state.
 * @param action - Action to be executed.
 * @returns Updated trading state.
 */
export function tradingReducer(state: TradingState, action: TradingAction): TradingState {
  switch (action.type) {
    case 'SET_SYMBOL':
      return {
        ...state,
        symbol: action.payload,
      };

    case 'SET_INTERVAL':
      return {
        ...state,
        interval: action.payload,
      };

    case 'SET_TIMEZONE':
      return {
        ...state,
        timezone: action.payload,
      };

    case 'SET_MARGIN':
      return {
        ...state,
        margin: Math.max(0, action.payload),
      };

    case 'SET_LEVERAGE':
      return {
        ...state,
        leverage: Math.max(1, action.payload),
      };

    case 'SET_DIRECTION':
      return {
        ...state,
        direction: action.payload,
      };

    case 'SET_ENTRY_PRICE':
      return {
        ...state,
        entryPrice: Math.max(0, action.payload),
      };

    case 'SET_PERCENTAGE_MOVE':
      return {
        ...state,
        percentageMove: action.payload,
      };

    case 'SET_MARGIN_MODE':
      return {
        ...state,
        marginMode: action.payload,
      };

    case 'SET_FEE_CONFIG':
      return {
        ...state,
        feeConfig: action.payload,
      };

    case 'SET_CANDLES':
      return {
        ...state,
        candles: action.payload,
      };

    case 'APPEND_CANDLES': {
      const { candles: incoming, direction } = action.payload;
      if (!incoming || incoming.length === 0) {
        return state;
      }

      // Combine existing and incoming candles based on direction
      const combined = direction === 'prepend'
        ? [...incoming, ...state.candles]
        : [...state.candles, ...incoming];

      // Deduplicate by timestamp (c.time)
      const candleMap = new Map<number, CandleData>();
      for (const candle of combined) {
        candleMap.set(candle.time, candle);
      }

      // Sort ascending by time
      const deduplicatedSorted = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);

      return {
        ...state,
        candles: deduplicatedSorted,
      };
    }

    case 'UPDATE_LIVE_CANDLE': {
      const live = action.payload;
      if (!state.candles || state.candles.length === 0) {
        return {
          ...state,
          liveCandle: live,
          candles: [live],
        };
      }

      const last = state.candles[state.candles.length - 1];
      let nextCandles: CandleData[];

      if (live.time === last.time) {
        // Update the current open candle in-place
        nextCandles = [...state.candles.slice(0, -1), live];
      } else if (live.time > last.time) {
        // New candle formed, append to series
        nextCandles = [...state.candles, live];
      } else {
        // Out of order: update existing timestamp if present, otherwise insert and sort
        const existingIdx = state.candles.findIndex((c) => c.time === live.time);
        if (existingIdx >= 0) {
          nextCandles = [...state.candles];
          nextCandles[existingIdx] = live;
        } else {
          nextCandles = [...state.candles, live].sort((a, b) => a.time - b.time);
        }
      }

      return {
        ...state,
        liveCandle: live,
        candles: nextCandles,
      };
    }

    case 'SET_MARK_PRICE':
      return {
        ...state,
        markPrice: action.payload,
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
      };

    case 'SET_AVAILABLE_SYMBOLS':
      return {
        ...state,
        availableSymbols: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
      };

    case 'TOGGLE_PRICE_LINE': {
      const line = action.payload;
      const isEnabled = state.enabledPriceLines.includes(line);
      const nextLines = isEnabled
        ? state.enabledPriceLines.filter((l) => l !== line)
        : [...state.enabledPriceLines, line].sort((a, b) => a - b);

      return {
        ...state,
        enabledPriceLines: nextLines,
      };
    }

    case 'RESET_DEFAULTS':
      return {
        ...initialState,
        symbol: state.symbol,
        candles: state.candles,
        liveCandle: state.liveCandle,
        markPrice: state.markPrice,
        connectionStatus: state.connectionStatus,
        availableSymbols: state.availableSymbols,
      };

    default:
      return state;
  }
}

/**
 * Context for trading state and dispatch actions.
 */
export const TradingContext = createContext<{
  state: TradingState;
  dispatch: React.Dispatch<TradingAction>;
} | null>(null);

/**
 * Context provider component wrapping application state.
 */
export function TradingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tradingReducer, initialState);

  return (
    <TradingContext.Provider value={{ state, dispatch }}>
      {children}
    </TradingContext.Provider>
  );
}

/**
 * Hook to consume the TradingContext.
 *
 * @throws Error if used outside of a TradingProvider.
 * @returns TradingState and dispatch function.
 */
export function useTradingContext() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
}
