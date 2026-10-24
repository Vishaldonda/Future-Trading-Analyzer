import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { useReducer } from 'react';
import { LiquidationWarning } from '../LiquidationWarning';
import { TradingContext, initialState, tradingReducer } from '../../../context/TradingContext';
import type { TradingState } from '../../../context/types';

function renderWithState(overrides: Partial<TradingState> = {}) {
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

  return render(<LiquidationWarning />, { wrapper: Wrapper });
}

describe('LiquidationWarning', () => {
  it('renders estimated liquidation price and mandatory disclaimer', () => {
    renderWithState({
      margin: 10,
      leverage: 10,
      entryPrice: 80000,
      direction: 'LONG',
    });

    expect(screen.getByText('Liquidation Risk')).toBeDefined();
    expect(screen.getByText('Est. Liquidation Price')).toBeDefined();
    expect(screen.getByText('Distance from Entry')).toBeDefined();
    expect(
      screen.getByText('This is an estimate. Actual liquidation may differ.')
    ).toBeDefined();
  });

  it('displays high risk badge for high leverage trades close to liquidation', () => {
    renderWithState({
      margin: 10,
      leverage: 100, // 100x leverage has very close liquidation (~1%)
      entryPrice: 80000,
      direction: 'LONG',
    });

    expect(screen.getByText(/High Risk/i)).toBeDefined();
  });

  it('displays low risk badge for low leverage trades', () => {
    renderWithState({
      margin: 10,
      leverage: 2, // 2x leverage has > 40% distance
      entryPrice: 80000,
      direction: 'LONG',
    });

    expect(screen.getByText(/Low Risk/i)).toBeDefined();
  });
});
