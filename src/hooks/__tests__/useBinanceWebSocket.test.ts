import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as wsModule from '../../api/binanceWebSocket';
import type { CandleData, ConnectionStatus, MarkPriceInfo } from '../../api/types';
import { useBinanceWebSocket } from '../useBinanceWebSocket';

describe('useBinanceWebSocket', () => {
  let capturedCallbacks: wsModule.BinanceWebSocketCallbacks;
  let connectSpy: ReturnType<typeof vi.fn>;
  let disconnectSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    connectSpy = vi.fn();
    disconnectSpy = vi.fn();

    class MockBinanceWs {
      constructor(callbacks: wsModule.BinanceWebSocketCallbacks) {
        capturedCallbacks = callbacks;
      }
      public connect = connectSpy;
      public disconnect = disconnectSpy;
      public changeSubscription = vi.fn();
      public getStatus = () => 'connected' as ConnectionStatus;
    }

    vi.spyOn(wsModule, 'BinanceWebSocket').mockImplementation(
      MockBinanceWs as unknown as typeof wsModule.BinanceWebSocket
    );
  });

  it('instantiates BinanceWebSocket on mount and connects with parameters', () => {
    const { unmount } = renderHook(() => useBinanceWebSocket('BTCUSDT', '15m'));

    expect(connectSpy).toHaveBeenCalledWith('BTCUSDT', '15m');

    unmount();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('updates state when WebSocket dispatches callbacks', () => {
    const { result } = renderHook(() => useBinanceWebSocket('BTCUSDT', '1h'));

    expect(result.current.liveCandle).toBeNull();
    expect(result.current.markPrice).toBeNull();

    const mockCandle: CandleData = {
      time: 1672531200,
      open: 16500,
      high: 16600,
      low: 16400,
      close: 16550,
      volume: 100,
      quoteVolume: 1655000,
      trades: 120,
      takerBuyVolume: 60,
      takerBuyQuoteVolume: 993000,
    };

    const mockPrice: MarkPriceInfo = {
      symbol: 'BTCUSDT',
      markPrice: '16550.00',
      indexPrice: '16545.00',
      lastFundingRate: '0.00010000',
      nextFundingTime: 1672560000000,
      time: 1672531200000,
    };

    act(() => {
      capturedCallbacks.onStatusChange('connected');
      capturedCallbacks.onKlineUpdate(mockCandle);
      capturedCallbacks.onMarkPriceUpdate(mockPrice);
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.liveCandle).toEqual(mockCandle);
    expect(result.current.markPrice).toEqual(mockPrice);
  });
});
