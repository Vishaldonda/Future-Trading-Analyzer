import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { useReducer } from 'react';
import { ResultsPanel } from '../ResultsPanel';
import { TradingContext, initialState, tradingReducer } from '../../../context/TradingContext';
import type { TradingState } from '../../../context/types';

function renderResultsWithState(overrides: Partial<TradingState> = {}) {
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

  return render(<ResultsPanel />, { wrapper: Wrapper });
}

describe('ResultsPanel', () => {
  it('computes and displays position size, gross/net P&L, fees, and ROM', () => {
    // 10 USDT margin * 10x leverage = 100 USDT position
    // Entry price = 80,000, +1% move -> exit 80,800
    // Gross P&L = 100 * 1% = +1.00 USDT
    // Fees: 100 * (0.0004 + 0.0004) = 0.08 USDT
    // Net P&L = 1.00 - 0.08 = 0.92 USDT
    // ROM = (0.92 / 10) * 100 = +9.20%
    renderResultsWithState({
      margin: 10,
      leverage: 10,
      entryPrice: 80000,
      percentageMove: 1,
      direction: 'LONG',
    });

    expect(screen.getByText('Position Overview')).toBeDefined();
    expect(screen.getByText('Profit & Loss Analysis')).toBeDefined();
    expect(screen.getByText('Risk & Liquidation')).toBeDefined();

    // Position Size
    expect(screen.getByText('$100.00')).toBeDefined();

    // Exit price
    expect(screen.getByText('$80,800.00')).toBeDefined();

    // Gross P&L
    expect(screen.getByText('$1.00')).toBeDefined();

    // Trading Fees
    expect(screen.getByText('-$0.08')).toBeDefined();

    // Net P&L
    expect(screen.getByText('$0.92')).toBeDefined();

    // Return on Margin
    expect(screen.getByText('+9.20%')).toBeDefined();

    // Remaining Equity: 10 + 0.92 = 10.92
    expect(screen.getByText('$10.92')).toBeDefined();

    // Liquidation Warning embedded
    expect(screen.getByText('Liquidation Risk')).toBeDefined();
  });

  it('computes SHORT direction P&L correctly', () => {
    // 10 USDT margin * 10x = 100 USDT position
    // +1% move on SHORT is a loss
    // Gross P&L = -1.00 USDT
    renderResultsWithState({
      margin: 10,
      leverage: 10,
      entryPrice: 80000,
      percentageMove: 1,
      direction: 'SHORT',
    });

    expect(screen.getByText('-$1.00')).toBeDefined();
  });
});
