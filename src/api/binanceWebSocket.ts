/**
 * Binance Futures WebSocket Manager module.
 *
 * Manages combined streams for live candlestick data (@kline_<interval>)
 * and mark price updates (@markPrice@1s). Handles automatic reconnections
 * with exponential backoff, periodic ping keep-alives, and stream changes.
 */

import type {
  CandleData,
  CandleInterval,
  ConnectionStatus,
  MarkPriceInfo,
} from './types';

export interface BinanceWebSocketCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onKlineUpdate: (candle: CandleData) => void;
  onMarkPriceUpdate: (price: MarkPriceInfo) => void;
}

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 1000;
  private status: ConnectionStatus = 'disconnected';
  private onStatusChange: (status: ConnectionStatus) => void;
  private onKlineUpdate: (candle: CandleData) => void;
  private onMarkPriceUpdate: (price: MarkPriceInfo) => void;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private currentSymbol = '';
  private currentInterval: CandleInterval = '1m';
  private isExplicitDisconnect = false;

  constructor(callbacks: BinanceWebSocketCallbacks) {
    this.onStatusChange = callbacks.onStatusChange;
    this.onKlineUpdate = callbacks.onKlineUpdate;
    this.onMarkPriceUpdate = callbacks.onMarkPriceUpdate;
  }

  /**
   * Internal status updater to notify listeners.
   */
  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.onStatusChange(newStatus);
    }
  }

  /**
   * Starts a 3-minute ping interval to keep the WebSocket connection alive.
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ method: 'PING' }));
        } catch {
          // Ignore write failure if socket closing
        }
      }
    }, 180000); // 3 minutes
  }

  /**
   * Stops the keep-alive ping interval.
   */
  private stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Clears any scheduled reconnection attempts.
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Connects to Binance Futures combined WebSocket stream for klines and mark price.
   *
   * @param symbol - Trading pair symbol (e.g., 'BTCUSDT').
   * @param interval - Candlestick interval (e.g., '1m', '1h').
   */
  public connect(symbol: string, interval: CandleInterval): void {
    this.clearReconnectTimer();

    // Clean up existing socket without triggering an explicit disconnected final state
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.stopPing();

    this.currentSymbol = symbol;
    this.currentInterval = interval;
    this.isExplicitDisconnect = false;

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const formattedSymbol = symbol.toLowerCase();
    const streams = `${formattedSymbol}@kline_${interval}/${formattedSymbol}@markPrice@1s`;
    const streamUrl = `wss://fstream.binance.com/stream?streams=${streams}`;

    try {
      this.ws = new WebSocket(streamUrl);
    } catch (err) {
      console.error('[Binance WS] Failed to instantiate WebSocket:', err);
      this.setStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startPing();
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data);
        const data = parsed.data || parsed;

        if (data.e === 'kline' && data.k) {
          const k = data.k;
          const candle: CandleData = {
            // Convert open time ms to seconds
            time: Math.floor(Number(k.t) / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            quoteVolume: parseFloat(k.q),
            trades: Number(k.n),
            takerBuyVolume: parseFloat(k.V),
            takerBuyQuoteVolume: parseFloat(k.Q),
          };
          this.onKlineUpdate(candle);
        } else if (data.e === 'markPriceUpdate') {
          const markPriceInfo: MarkPriceInfo = {
            symbol: data.s,
            markPrice: data.p,
            indexPrice: data.i,
            lastFundingRate: data.r,
            nextFundingTime: Number(data.T),
            time: Number(data.E),
          };
          this.onMarkPriceUpdate(markPriceInfo);
        }
      } catch (err) {
        console.warn('[Binance WS] Error parsing incoming message:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[Binance WS] WebSocket error encountered:', err);
      if (!this.isExplicitDisconnect) {
        this.setStatus('error');
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.ws = null;

      if (!this.isExplicitDisconnect) {
        this.scheduleReconnect();
      } else {
        this.setStatus('disconnected');
      }
    };
  }

  /**
   * Schedules an auto-reconnect attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Exponential backoff: 1s, 1.5s, 2.25s, ... capped at 30 seconds
      const delay = Math.min(
        this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
        30000
      );

      this.setStatus('reconnecting');

      this.reconnectTimer = setTimeout(() => {
        if (!this.isExplicitDisconnect && this.currentSymbol) {
          this.connect(this.currentSymbol, this.currentInterval);
        }
      }, delay);
    } else {
      console.warn('[Binance WS] Max reconnection attempts reached.');
      this.setStatus('disconnected');
    }
  }

  /**
   * Changes the active symbol and interval subscription, recycling the connection.
   *
   * @param symbol - New trading pair symbol.
   * @param interval - New candlestick interval.
   */
  public changeSubscription(symbol: string, interval: CandleInterval): void {
    if (
      this.currentSymbol === symbol &&
      this.currentInterval === interval &&
      this.status === 'connected'
    ) {
      return;
    }
    this.reconnectAttempts = 0;
    this.connect(symbol, interval);
  }

  /**
   * Disconnects the WebSocket stream, cleans up intervals and aborts retries.
   */
  public disconnect(): void {
    this.isExplicitDisconnect = true;
    this.clearReconnectTimer();
    this.stopPing();

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }

  /**
   * Returns current connection status.
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }
}
