import { describe, it, expect } from 'vitest';
import {
  findBracket,
  calcLiquidationPriceIsolatedLong,
  calcLiquidationPriceIsolatedShort,
  estimateLiquidationPrice,
  DEFAULT_BTC_BRACKETS,
  type MarginBracket,
} from '../liquidation';

describe('Liquidation Calculations', () => {
  it('finds correct tier for different position notional values', () => {
    const tier1 = findBracket(DEFAULT_BTC_BRACKETS, 250_000);
    expect(tier1.bracket).toBe(1);
    expect(tier1.maintMarginRatio).toBe(0.004);

    const tier2 = findBracket(DEFAULT_BTC_BRACKETS, 1_000_000);
    expect(tier2.bracket).toBe(2);
    expect(tier2.maintMarginRatio).toBe(0.005);
    expect(tier2.cum).toBe(500);

    const tier3 = findBracket(DEFAULT_BTC_BRACKETS, 10_000_000);
    expect(tier3.bracket).toBe(3);
    expect(tier3.maintMarginRatio).toBe(0.01);
    expect(tier3.cum).toBe(25_500);
  });

  it('calculates isolated long liquidation price significantly below entry: entry 80000, margin 10, leverage 10', () => {
    const entryPrice = 80000;
    const margin = 10;
    const positionSize = 100;
    const quantity = positionSize / entryPrice; // 0.00125
    const mmr = 0.004;
    const cum = 0;

    const liqPrice = calcLiquidationPriceIsolatedLong(entryPrice, quantity, margin, mmr, cum);

    expect(liqPrice).toBeLessThan(entryPrice);
    // Formula: (80000 * 0.00125 - 10 + 0) / (0.00125 * (1 - 0.004)) = 90 / 0.001245 = 72289.1566...
    expect(liqPrice).toBeCloseTo(72289.1566, 2);
  });

  it('calculates isolated short liquidation price above entry: entry 80000, margin 10, leverage 10', () => {
    const entryPrice = 80000;
    const margin = 10;
    const positionSize = 100;
    const quantity = positionSize / entryPrice; // 0.00125
    const mmr = 0.004;
    const cum = 0;

    const liqPrice = calcLiquidationPriceIsolatedShort(entryPrice, quantity, margin, mmr, cum);

    expect(liqPrice).toBeGreaterThan(entryPrice);
    // Formula: (80000 * 0.00125 + 10 - 0) / (0.00125 * (1 + 0.004)) = 110 / 0.001255 = 87649.4023...
    expect(liqPrice).toBeCloseTo(87649.4023, 2);
  });

  it('ensures higher leverage results in closer liquidation price to entry', () => {
    const entryPrice = 80000;
    const margin = 10;

    // LONG at 10x vs 50x
    const result10xLong = estimateLiquidationPrice({
      entryPrice,
      margin,
      leverage: 10,
      direction: 'LONG',
      brackets: DEFAULT_BTC_BRACKETS,
    });
    const result50xLong = estimateLiquidationPrice({
      entryPrice,
      margin,
      leverage: 50,
      direction: 'LONG',
      brackets: DEFAULT_BTC_BRACKETS,
    });

    expect(result10xLong.price).not.toBeNull();
    expect(result50xLong.price).not.toBeNull();

    const distance10xLong = entryPrice - (result10xLong.price as number);
    const distance50xLong = entryPrice - (result50xLong.price as number);

    expect(distance50xLong).toBeLessThan(distance10xLong);
    expect(result50xLong.price).toBeGreaterThan(result10xLong.price as number);

    // SHORT at 10x vs 50x
    const result10xShort = estimateLiquidationPrice({
      entryPrice,
      margin,
      leverage: 10,
      direction: 'SHORT',
      brackets: DEFAULT_BTC_BRACKETS,
    });
    const result50xShort = estimateLiquidationPrice({
      entryPrice,
      margin,
      leverage: 50,
      direction: 'SHORT',
      brackets: DEFAULT_BTC_BRACKETS,
    });

    const distance10xShort = (result10xShort.price as number) - entryPrice;
    const distance50xShort = (result50xShort.price as number) - entryPrice;

    expect(distance50xShort).toBeLessThan(distance10xShort);
    expect(result50xShort.price).toBeLessThan(result10xShort.price as number);
  });

  it('returns isEstimate=true with warning when brackets not from API', () => {
    const result = estimateLiquidationPrice({
      entryPrice: 80000,
      margin: 10,
      leverage: 10,
      direction: 'LONG',
    });

    expect(result.isEstimate).toBe(true);
    expect(result.warning).toBeDefined();
    expect(typeof result.warning).toBe('string');
    expect(result.warning?.length).toBeGreaterThan(0);
    expect(result.price).toBeCloseTo(72289.1566, 2);
  });

  it('returns isEstimate=false and no warning when custom API brackets are provided', () => {
    const customBrackets: MarginBracket[] = [
      {
        bracket: 1,
        initialLeverage: 100,
        notionalFloor: 0,
        notionalCap: 1_000_000,
        maintMarginRatio: 0.005,
        cum: 0,
      },
    ];

    const result = estimateLiquidationPrice({
      entryPrice: 80000,
      margin: 10,
      leverage: 10,
      direction: 'LONG',
      brackets: customBrackets,
    });

    expect(result.isEstimate).toBe(false);
    expect(result.warning).toBeUndefined();
    expect(result.price).toBeGreaterThan(0);
  });

  it('includes cross margin warning when marginMode is CROSS', () => {
    const result = estimateLiquidationPrice({
      entryPrice: 80000,
      margin: 10,
      leverage: 10,
      direction: 'LONG',
      marginMode: 'CROSS',
      brackets: DEFAULT_BTC_BRACKETS,
    });

    expect(result.isEstimate).toBe(true);
    expect(result.warning).toContain('Cross margin');
  });

  it('handles invalid non-positive inputs gracefully', () => {
    const invalidResult = estimateLiquidationPrice({
      entryPrice: -80000,
      margin: 10,
      leverage: 10,
      direction: 'LONG',
    });
    expect(invalidResult.price).toBeNull();
    expect(invalidResult.warning).toContain('Invalid parameters');
  });
});
