import { describe, it, expect } from 'vitest';
import {
  calcPositionSize,
  calcPriceChange,
  calcExitPrice,
  calcGrossPnL,
  calcReturnOnMargin,
  calcNetPnL,
  calcRemainingEquity,
  calcNotionalValue,
  calcQuantity,
} from '../pnl';

describe('P&L and Position Calculations', () => {
  it('calculates position size: 10 USDT × 10x = 100 USDT', () => {
    const margin = 10;
    const leverage = 10;
    expect(calcPositionSize(margin, leverage)).toBe(100);
  });

  it('calculates price change: entry 80000, exit 80800 = 1%', () => {
    const entry = 80000;
    const exit = 80800;
    expect(calcPriceChange(entry, exit)).toBe(1);
  });

  it('calculates exit price: entry 80000, +1% = 80800', () => {
    const entry = 80000;
    const movePct = 1;
    expect(calcExitPrice(entry, movePct)).toBe(80800);
  });

  it('calculates LONG P&L: position 100, +1% = +1 USDT', () => {
    const position = 100;
    const movePct = 1;
    expect(calcGrossPnL(position, movePct, 'LONG')).toBe(1);
  });

  it('calculates SHORT P&L: position 100, +1% = -1 USDT', () => {
    const position = 100;
    const movePct = 1;
    expect(calcGrossPnL(position, movePct, 'SHORT')).toBe(-1);
  });

  it('calculates LONG P&L: position 100, -5% = -5 USDT', () => {
    const position = 100;
    const movePct = -5;
    expect(calcGrossPnL(position, movePct, 'LONG')).toBe(-5);
  });

  it('calculates SHORT P&L: position 100, -5% = +5 USDT', () => {
    const position = 100;
    const movePct = -5;
    expect(calcGrossPnL(position, movePct, 'SHORT')).toBe(5);
  });

  it('calculates return on margin: 1 USDT on 10 USDT = 10%', () => {
    const pnl = 1;
    const margin = 10;
    expect(calcReturnOnMargin(pnl, margin)).toBe(10);
  });

  it('calculates net P&L: gross 1 - fees 0.08 - funding 0 = 0.92', () => {
    const grossPnl = 1;
    const totalFees = 0.08;
    const funding = 0;
    expect(calcNetPnL(grossPnl, totalFees, funding)).toBe(0.92);
  });

  it('calculates remaining equity: 10 + 0.92 = 10.92', () => {
    const margin = 10;
    const netPnl = 0.92;
    expect(calcRemainingEquity(margin, netPnl)).toBe(10.92);
  });

  it('handles edge case: 0% move = 0 P&L', () => {
    const position = 100;
    expect(calcGrossPnL(position, 0, 'LONG')).toBe(0);
    expect(calcGrossPnL(position, 0, 'SHORT')).toBe(0);
  });

  it('handles edge case: 0 margin = 0 position size', () => {
    expect(calcPositionSize(0, 10)).toBe(0);
    expect(calcPositionSize(-5, 10)).toBe(0);
    expect(calcPositionSize(10, 0)).toBe(0);
    expect(calcPositionSize(10, -2)).toBe(0);
  });

  it('calculates notional value: entry 80000 × quantity 0.00125 = 100 USDT', () => {
    expect(calcNotionalValue(80000, 0.00125)).toBe(100);
  });

  it('calculates quantity: positionSize 100 / entry 80000 = 0.00125 BTC', () => {
    expect(calcQuantity(100, 80000)).toBe(0.00125);
  });

  it('handles edge cases gracefully for prices and margins', () => {
    expect(calcPriceChange(0, 80000)).toBe(0);
    expect(calcExitPrice(0, 5)).toBe(0);
    expect(calcReturnOnMargin(10, 0)).toBe(0);
    expect(calcQuantity(100, 0)).toBe(0);
    expect(calcNotionalValue(0, 10)).toBe(0);
  });
});
