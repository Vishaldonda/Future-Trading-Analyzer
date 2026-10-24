import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  initialState,
  tradingReducer,
  TradingProvider,
  useTradingContext,
} from '../TradingContext';
import type { CandleData } from '../../api/types';

const mockCandle = (time: number, close: number): CandleData => ({
  time,
  open: close - 10,
  high: close + 20,
  low: close - 20,
  close,
  volume: 100,
  quoteVolume: 100 * close,
  trades: 50,
  takerBuyVolume: 40,
  takerBuyQuoteVolume: 40 * close,
});

describe('tradingReducer', () => {
  it('updates simple trading inputs', () => {
    let state = tradingReducer(initialState, { type: 'SET_SYMBOL', payload: 'ETHUSDT' });
    expect(state.symbol).toBe('ETHUSDT');

    state = tradingReducer(state, { type: 'SET_INTERVAL', payload: '15m' });
    expect(state.interval).toBe('15m');

    state = tradingReducer(state, { type: 'SET_TIMEZONE', payload: 'Asia/Tokyo' });
    expect(state.timezone).toBe('Asia/Tokyo');

    state = tradingReducer(state, { type: 'SET_MARGIN', payload: 50 });
    expect(state.margin).toBe(50);

    state = tradingReducer(state, { type: 'SET_LEVERAGE', payload: 20 });
    expect(state.leverage).toBe(20);

    state = tradingReducer(state, { type: 'SET_DIRECTION', payload: 'SHORT' });
    expect(state.direction).toBe('SHORT');

    state = tradingReducer(state, { type: 'SET_ENTRY_PRICE', payload: 75000 });
    expect(state.entryPrice).toBe(75000);

    state = tradingReducer(state, { type: 'SET_PERCENTAGE_MOVE', payload: 3.5 });
    expect(state.percentageMove).toBe(3.5);

    state = tradingReducer(state, { type: 'SET_MARGIN_MODE', payload: 'cross' });
    expect(state.marginMode).toBe('cross');

    state = tradingReducer(state, {
      type: 'SET_FEE_CONFIG',
      payload: { makerRate: 0.0001, takerRate: 0.0002 },
    });
    expect(state.feeConfig.makerRate).toBe(0.0001);
  });

  it('handles SET_CANDLES', () => {
    const candles = [mockCandle(100, 50000), mockCandle(200, 51000)];
    const state = tradingReducer(initialState, { type: 'SET_CANDLES', payload: candles });
    expect(state.candles.length).toBe(2);
    expect(state.candles[0].close).toBe(50000);
  });

  it('handles APPEND_CANDLES with deduplication and sorting', () => {
    const existing = [mockCandle(100, 50000), mockCandle(200, 51000)];
    let state = { ...initialState, candles: existing };

    // Prepend older candles with one overlapping timestamp
    const incomingPrepend = [mockCandle(50, 49000), mockCandle(100, 50500)];
    state = tradingReducer(state, {
      type: 'APPEND_CANDLES',
      payload: { candles: incomingPrepend, direction: 'prepend' },
    });

    expect(state.candles.length).toBe(3);
    expect(state.candles.map((c) => c.time)).toEqual([50, 100, 200]);

    // Append newer candles
    const incomingAppend = [mockCandle(200, 51500), mockCandle(300, 52000)];
    state = tradingReducer(state, {
      type: 'APPEND_CANDLES',
      payload: { candles: incomingAppend, direction: 'append' },
    });

    expect(state.candles.length).toBe(4);
    expect(state.candles.map((c) => c.time)).toEqual([50, 100, 200, 300]);
    expect(state.candles[2].close).toBe(51500); // Updated via append
  });

  it('handles UPDATE_LIVE_CANDLE correctly', () => {
    let state = { ...initialState, candles: [mockCandle(100, 50000)] };

    // Update current open candle
    const updatedCurrent = mockCandle(100, 50200);
    state = tradingReducer(state, { type: 'UPDATE_LIVE_CANDLE', payload: updatedCurrent });
    expect(state.candles.length).toBe(1);
    expect(state.candles[0].close).toBe(50200);
    expect(state.liveCandle?.close).toBe(50200);

    // Form new candle
    const nextCandle = mockCandle(200, 50800);
    state = tradingReducer(state, { type: 'UPDATE_LIVE_CANDLE', payload: nextCandle });
    expect(state.candles.length).toBe(2);
    expect(state.candles[1].close).toBe(50800);
  });

  it('handles TOGGLE_PRICE_LINE', () => {
    let state = { ...initialState, enabledPriceLines: [1, 2, 3] };

    // Remove existing line 2
    state = tradingReducer(state, { type: 'TOGGLE_PRICE_LINE', payload: 2 });
    expect(state.enabledPriceLines).toEqual([1, 3]);

    // Add back line 2 (keeps sorted)
    state = tradingReducer(state, { type: 'TOGGLE_PRICE_LINE', payload: 2 });
    expect(state.enabledPriceLines).toEqual([1, 2, 3]);
  });

  it('handles RESET_DEFAULTS while preserving market data', () => {
    const marketCandles = [mockCandle(100, 50000)];
    const modifiedState = {
      ...initialState,
      margin: 100,
      leverage: 50,
      direction: 'SHORT' as const,
      symbol: 'ETHUSDT',
      candles: marketCandles,
      markPrice: 50000,
      connectionStatus: 'connected' as const,
    };

    const resetState = tradingReducer(modifiedState, { type: 'RESET_DEFAULTS' });
    expect(resetState.margin).toBe(initialState.margin);
    expect(resetState.leverage).toBe(initialState.leverage);
    expect(resetState.direction).toBe(initialState.direction);

    // Market data is preserved
    expect(resetState.symbol).toBe('ETHUSDT');
    expect(resetState.candles).toEqual(marketCandles);
    expect(resetState.markPrice).toBe(50000);
    expect(resetState.connectionStatus).toBe('connected');
  });
});

describe('TradingProvider and useTradingContext', () => {
  it('throws when useTradingContext is called outside provider', () => {
    expect(() => renderHook(() => useTradingContext())).toThrow(
      'useTradingContext must be used within a TradingProvider'
    );
  });

  it('provides state and dispatch within provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TradingProvider>{children}</TradingProvider>
    );

    const { result } = renderHook(() => useTradingContext(), { wrapper });
    expect(result.current.state.symbol).toBe('BTCUSDT');

    act(() => {
      result.current.dispatch({ type: 'SET_MARGIN', payload: 25 });
    });

    expect(result.current.state.margin).toBe(25);
  });
});
