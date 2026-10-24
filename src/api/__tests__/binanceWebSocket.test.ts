import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BinanceWebSocket } from '../binanceWebSocket';
import type { ConnectionStatus } from '../types';

class MockWebSocket {
  public static OPEN = 1;
  public static CONNECTING = 0;
  public static CLOSING = 2;
  public static CLOSED = 3;
  public static instances: MockWebSocket[] = [];
  public url: string;
  public readyState: number = 0; // CONNECTING
  public onopen: (() => void) | null = null;
  public onmessage: ((event: MessageEvent<string>) => void) | null = null;
  public onerror: ((event: unknown) => void) | null = null;
  public onclose: (() => void) | null = null;
  public sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  public send(msg: string) {
    this.sentMessages.push(msg);
  }

  public close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose();
    }
  }

  public simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen();
    }
  }

  public simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  public simulateError(err: unknown) {
    if (this.onerror) {
      this.onerror(err);
    }
  }
}

describe('BinanceWebSocket', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    // @ts-expect-error Mocking WebSocket
    globalThis.WebSocket = MockWebSocket;
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it('connects to combined kline and markPrice stream and updates status', () => {
    const statuses: ConnectionStatus[] = [];
    const ws = new BinanceWebSocket({
      onStatusChange: (s) => statuses.push(s),
      onKlineUpdate: vi.fn(),
      onMarkPriceUpdate: vi.fn(),
    });

    ws.connect('BTCUSDT', '1h');

    expect(statuses).toContain('connecting');
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(
      'wss://fstream.binance.com/stream?streams=btcusdt@kline_1h/btcusdt@markPrice@1s'
    );

    MockWebSocket.instances[0].simulateOpen();
    expect(ws.getStatus()).toBe('connected');
    expect(statuses).toContain('connected');

    ws.disconnect();
    expect(ws.getStatus()).toBe('disconnected');
  });

  it('dispatches kline updates on incoming kline messages', () => {
    const onKline = vi.fn();
    const ws = new BinanceWebSocket({
      onStatusChange: vi.fn(),
      onKlineUpdate: onKline,
      onMarkPriceUpdate: vi.fn(),
    });

    ws.connect('BTCUSDT', '15m');
    MockWebSocket.instances[0].simulateOpen();

    MockWebSocket.instances[0].simulateMessage({
      stream: 'btcusdt@kline_15m',
      data: {
        e: 'kline',
        E: 1672531200000,
        s: 'BTCUSDT',
        k: {
          t: 1672531200000,
          T: 1672532099999,
          s: 'BTCUSDT',
          i: '15m',
          f: 100,
          L: 200,
          o: '20000.00',
          c: '20100.00',
          h: '20150.00',
          l: '19950.00',
          v: '50.5',
          n: 400,
          x: false,
          q: '1015050',
          V: '25.2',
          Q: '506500',
          B: '0',
        },
      },
    });

    expect(onKline).toHaveBeenCalledWith({
      time: 1672531200,
      open: 20000,
      close: 20100,
      high: 20150,
      low: 19950,
      volume: 50.5,
      quoteVolume: 1015050,
      trades: 400,
      takerBuyVolume: 25.2,
      takerBuyQuoteVolume: 506500,
    });

    ws.disconnect();
  });

  it('dispatches mark price updates on markPriceUpdate events', () => {
    const onMarkPrice = vi.fn();
    const ws = new BinanceWebSocket({
      onStatusChange: vi.fn(),
      onKlineUpdate: vi.fn(),
      onMarkPriceUpdate: onMarkPrice,
    });

    ws.connect('BTCUSDT', '1h');
    MockWebSocket.instances[0].simulateOpen();

    MockWebSocket.instances[0].simulateMessage({
      stream: 'btcusdt@markPrice@1s',
      data: {
        e: 'markPriceUpdate',
        E: 1672531201000,
        s: 'BTCUSDT',
        p: '20050.25',
        i: '20045.00',
        P: '20055.00',
        r: '0.00010000',
        T: 1672560000000,
      },
    });

    expect(onMarkPrice).toHaveBeenCalledWith({
      symbol: 'BTCUSDT',
      markPrice: '20050.25',
      indexPrice: '20045.00',
      lastFundingRate: '0.00010000',
      nextFundingTime: 1672560000000,
      time: 1672531201000,
    });

    ws.disconnect();
  });

  it('sends keepalive ping every 3 minutes while connected', () => {
    const ws = new BinanceWebSocket({
      onStatusChange: vi.fn(),
      onKlineUpdate: vi.fn(),
      onMarkPriceUpdate: vi.fn(),
    });

    ws.connect('BTCUSDT', '1h');
    MockWebSocket.instances[0].simulateOpen();

    expect(MockWebSocket.instances[0].sentMessages).toHaveLength(0);

    vi.advanceTimersByTime(180000);
    expect(MockWebSocket.instances[0].sentMessages).toContain(JSON.stringify({ method: 'PING' }));

    ws.disconnect();
  });

  it('reconnects with exponential backoff if socket closes unexpectedly', () => {
    const statuses: ConnectionStatus[] = [];
    const ws = new BinanceWebSocket({
      onStatusChange: (s) => statuses.push(s),
      onKlineUpdate: vi.fn(),
      onMarkPriceUpdate: vi.fn(),
    });

    ws.connect('BTCUSDT', '1h');
    MockWebSocket.instances[0].simulateOpen();

    // Unexpected close
    MockWebSocket.instances[0].close();

    expect(statuses).toContain('reconnecting');

    // Advance 1s (reconnectDelay * 1.5^0 = 1000ms)
    vi.advanceTimersByTime(1000);

    expect(MockWebSocket.instances.length).toBeGreaterThan(1);

    ws.disconnect();
  });
});
