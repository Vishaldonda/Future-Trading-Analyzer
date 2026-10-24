import { describe, it, expect } from 'vitest';
import {
  calcTradingFee,
  calcRoundTripFees,
  calcFundingPayment,
  DEFAULT_FEE_CONFIG,
  DEFAULT_MAKER_FEE_RATE,
  DEFAULT_TAKER_FEE_RATE,
} from '../fees';

describe('Trading Fees and Funding Calculations', () => {
  it('has default maker and taker fee rates of 0.0002 and 0.0004', () => {
    expect(DEFAULT_MAKER_FEE_RATE).toBe(0.0002);
    expect(DEFAULT_TAKER_FEE_RATE).toBe(0.0004);
    expect(DEFAULT_FEE_CONFIG.makerRate).toBe(0.0002);
    expect(DEFAULT_FEE_CONFIG.takerRate).toBe(0.0004);
    expect(DEFAULT_FEE_CONFIG.fundingRate).toBe(0);
  });

  it('calculates single trading fee: 100 USDT × 0.0004 = 0.04 USDT', () => {
    expect(calcTradingFee(100, 0.0004)).toBe(0.04);
  });

  it('calculates round trip fees with defaults (entry taker + exit taker): 100 USDT = 0.08 USDT', () => {
    expect(calcRoundTripFees(100)).toBe(0.08);
    expect(calcRoundTripFees(100, 0.0002, 0.0004)).toBe(0.08);
  });

  it('calculates round trip fees with custom order types', () => {
    // Taker entry (0.0004) + Maker exit (0.0002) = 0.06 USDT on 100 USDT
    expect(calcRoundTripFees(100, 0.0002, 0.0004, 'taker', 'maker')).toBe(0.06);
    // Maker entry (0.0002) + Maker exit (0.0002) = 0.04 USDT on 100 USDT
    expect(calcRoundTripFees(100, 0.0002, 0.0004, 'maker', 'maker')).toBe(0.04);
  });

  it('calculates funding payment correctly', () => {
    // 100 USDT position with +0.01% funding rate (0.0001)
    expect(calcFundingPayment(100, 0.0001)).toBe(0.01);
    // 0 funding rate = 0 payment
    expect(calcFundingPayment(100, 0)).toBe(0);
  });

  it('handles edge cases gracefully', () => {
    expect(calcTradingFee(0, 0.0004)).toBe(0);
    expect(calcTradingFee(-100, 0.0004)).toBe(0);
    expect(calcTradingFee(100, 0)).toBe(0);
    expect(calcRoundTripFees(0)).toBe(0);
    expect(calcFundingPayment(0, 0.0001)).toBe(0);
  });
});
