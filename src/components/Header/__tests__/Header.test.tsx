import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useReducer } from 'react';
import { Header } from '../Header';
import { TradingContext, initialState, tradingReducer } from '../../../context/TradingContext';
import type { TradingState } from '../../../context/types';

function renderHeaderWithState(overrides: Partial<TradingState> = {}) {
  const customInitial: TradingState = {
    ...initialState,
    ...overrides,
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(tradingReducer, customInitial);
    return (
      <TradingContext.Provider value={{ state, dispatch }}>
        {children}
      </TradingContext.Provider>
    );
  };

  return render(<Header />, { wrapper: Wrapper });
}

describe('Header', () => {
  it('renders app title, disclaimer, and current symbol fallback when availableSymbols is empty', () => {
    renderHeaderWithState({
      symbol: 'BTCUSDT',
      availableSymbols: [],
      connectionStatus: 'connected',
      markPrice: 80500,
    });

    expect(screen.getByText('Future Trading Analyzer')).toBeDefined();
    expect(screen.getByText('For analysis only. Not financial advice.')).toBeDefined();
    expect(screen.getByText('Live')).toBeDefined();
    expect(screen.getByText('$80,500.00')).toBeDefined();

    const select = screen.getByLabelText('Select trading pair') as HTMLSelectElement;
    expect(select.value).toBe('BTCUSDT');
  });

  it('populates trading pair selector from availableSymbols and handles change', () => {
    const mockSymbols = [
      {
        symbol: 'BTCUSDT',
        pair: 'BTCUSDT',
        contractType: 'PERPETUAL',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        pricePrecision: 2,
        quantityPrecision: 3,
        maxLeverage: 125,
      },
      {
        symbol: 'ETHUSDT',
        pair: 'ETHUSDT',
        contractType: 'PERPETUAL',
        baseAsset: 'ETH',
        quoteAsset: 'USDT',
        pricePrecision: 2,
        quantityPrecision: 3,
        maxLeverage: 100,
      },
    ];

    renderHeaderWithState({
      symbol: 'BTCUSDT',
      availableSymbols: mockSymbols,
      connectionStatus: 'connected',
    });

    const select = screen.getByLabelText('Select trading pair') as HTMLSelectElement;
    expect(select.options.length).toBe(2);

    fireEvent.change(select, { target: { value: 'ETHUSDT' } });
    expect(select.value).toBe('ETHUSDT');
  });

  it('renders different connection badges properly', () => {
    const { unmount } = renderHeaderWithState({ connectionStatus: 'reconnecting' });
    expect(screen.getByText('Reconnecting')).toBeDefined();
    unmount();

    renderHeaderWithState({ connectionStatus: 'disconnected' });
    expect(screen.getByText('Disconnected')).toBeDefined();
  });
});
