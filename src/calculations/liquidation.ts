/**
 * Liquidation price calculations for USDT-margined linear futures contracts.
 */

import type { TradeDirection } from './pnl';

/**
 * Margin bracket definition for tiered maintenance margin requirements.
 */
export interface MarginBracket {
  bracket: number;
  initialLeverage: number;
  notionalCap: number;
  notionalFloor: number;
  maintMarginRatio: number;
  cum: number; // cumulative maintenance amount
}

export type MarginMode = 'ISOLATED' | 'CROSS';

/**
 * Default BTCUSDT linear futures margin brackets (Binance reference tiers).
 * Tier 1: 0-500,000 USDT, 125x, 0.4% MMR, cum=0
 * Tier 2: 500,001-5,000,000 USDT, 50x, 0.5% MMR, cum=500
 * Tier 3: 5,000,001-25,000,000 USDT, 20x, 1.0% MMR, cum=25,500
 */
export const DEFAULT_BTC_BRACKETS: MarginBracket[] = [
  {
    bracket: 1,
    initialLeverage: 125,
    notionalFloor: 0,
    notionalCap: 500_000,
    maintMarginRatio: 0.004,
    cum: 0,
  },
  {
    bracket: 2,
    initialLeverage: 50,
    notionalFloor: 500_001,
    notionalCap: 5_000_000,
    maintMarginRatio: 0.005,
    cum: 500,
  },
  {
    bracket: 3,
    initialLeverage: 20,
    notionalFloor: 5_000_001,
    notionalCap: 25_000_000,
    maintMarginRatio: 0.01,
    cum: 25_500,
  },
];

/**
 * Finds the margin bracket applicable to a given position notional value.
 *
 * @param brackets - Array of margin brackets.
 * @param notionalValue - Position notional value in USDT.
 * @returns The matching MarginBracket. Defaults to Tier 1 if brackets is empty.
 */
export function findBracket(brackets: MarginBracket[], notionalValue: number): MarginBracket {
  const activeBrackets = brackets && brackets.length > 0 ? brackets : DEFAULT_BTC_BRACKETS;
  const absNotional = Math.abs(notionalValue);

  const sorted = [...activeBrackets].sort((a, b) => a.bracket - b.bracket);

  // Exact floor/cap check
  const exact = sorted.find((b) => absNotional >= b.notionalFloor && absNotional <= b.notionalCap);
  if (exact) {
    return exact;
  }

  // Value before or in gap up to notionalCap
  for (let i = 0; i < sorted.length; i++) {
    if (absNotional <= sorted[i].notionalCap) {
      return sorted[i];
    }
  }

  // Beyond maximum bracket cap
  return sorted[sorted.length - 1];
}

/**
 * Calculates isolated liquidation price for a LONG position.
 *
 * Formula: (entryPrice × quantity - isolatedMarginBalance + cum) / (quantity × (1 - mmr))
 *
 * @param entryPrice - Entry price in USDT.
 * @param quantity - Position quantity in underlying asset units.
 * @param isolatedMarginBalance - Isolated margin balance in USDT.
 * @param mmr - Maintenance margin ratio (e.g., 0.004 for 0.4%).
 * @param cum - Cumulative maintenance amount in USDT.
 * @returns Liquidation price in USDT. Returns 0 if calculation results in non-positive or invalid value.
 */
export function calcLiquidationPriceIsolatedLong(
  entryPrice: number,
  quantity: number,
  isolatedMarginBalance: number,
  mmr: number,
  cum: number
): number {
  if (quantity <= 0 || 1 - mmr <= 0 || !Number.isFinite(quantity) || !Number.isFinite(entryPrice)) {
    return 0;
  }

  const numerator = entryPrice * quantity - isolatedMarginBalance + cum;
  const denominator = quantity * (1 - mmr);

  if (denominator <= 0) {
    return 0;
  }

  const price = numerator / denominator;
  return price > 0 ? price : 0;
}

/**
 * Calculates isolated liquidation price for a SHORT position.
 *
 * Formula: (entryPrice × quantity + isolatedMarginBalance - cum) / (quantity × (1 + mmr))
 *
 * @param entryPrice - Entry price in USDT.
 * @param quantity - Position quantity in underlying asset units.
 * @param isolatedMarginBalance - Isolated margin balance in USDT.
 * @param mmr - Maintenance margin ratio (e.g., 0.004 for 0.4%).
 * @param cum - Cumulative maintenance amount in USDT.
 * @returns Liquidation price in USDT. Returns 0 if calculation results in non-positive or invalid value.
 */
export function calcLiquidationPriceIsolatedShort(
  entryPrice: number,
  quantity: number,
  isolatedMarginBalance: number,
  mmr: number,
  cum: number
): number {
  if (quantity <= 0 || 1 + mmr <= 0 || !Number.isFinite(quantity) || !Number.isFinite(entryPrice)) {
    return 0;
  }

  const numerator = entryPrice * quantity + isolatedMarginBalance - cum;
  const denominator = quantity * (1 + mmr);

  if (denominator <= 0) {
    return 0;
  }

  const price = numerator / denominator;
  return price > 0 ? price : 0;
}

export interface EstimateLiquidationParams {
  entryPrice: number;
  margin: number;
  leverage: number;
  direction: TradeDirection;
  marginMode?: MarginMode;
  brackets?: MarginBracket[];
}

export interface LiquidationEstimateResult {
  price: number | null;
  isEstimate: boolean;
  warning?: string;
}

/**
 * Estimates liquidation price for a futures position.
 *
 * When custom margin brackets are not provided, default BTCUSDT brackets are used
 * and `isEstimate` is set to true with an explanatory warning.
 *
 * @param params - Configuration including entry price, margin, leverage, direction, margin mode, and optional brackets.
 * @returns Object containing estimated liquidation price, isEstimate flag, and optional warning message.
 */
export function estimateLiquidationPrice(
  params: EstimateLiquidationParams
): LiquidationEstimateResult {
  const {
    entryPrice,
    margin,
    leverage,
    direction,
    marginMode = 'ISOLATED',
    brackets,
  } = params;

  if (
    entryPrice <= 0 ||
    margin <= 0 ||
    leverage <= 0 ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(margin) ||
    !Number.isFinite(leverage)
  ) {
    return {
      price: null,
      isEstimate: true,
      warning: 'Invalid parameters: entryPrice, margin, and leverage must be positive numbers.',
    };
  }

  const hasCustomBrackets = Array.isArray(brackets) && brackets.length > 0;
  const activeBrackets = hasCustomBrackets ? brackets : DEFAULT_BTC_BRACKETS;

  const warnings: string[] = [];
  let isEstimate = false;

  if (!hasCustomBrackets) {
    isEstimate = true;
    warnings.push('Using default BTCUSDT margin brackets (not live from API).');
  }

  if (marginMode === 'CROSS') {
    isEstimate = true;
    warnings.push(
      'Cross margin liquidation depends on total account balance and other open positions; this estimate assumes isolated margin allocation.'
    );
  }

  const positionSize = margin * leverage;
  const quantity = positionSize / entryPrice;
  const bracket = findBracket(activeBrackets, positionSize);
  const { maintMarginRatio, cum } = bracket;

  let price: number;
  if (direction === 'LONG') {
    price = calcLiquidationPriceIsolatedLong(entryPrice, quantity, margin, maintMarginRatio, cum);
  } else {
    price = calcLiquidationPriceIsolatedShort(entryPrice, quantity, margin, maintMarginRatio, cum);
  }

  return {
    price: price > 0 ? price : 0,
    isEstimate,
    ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}),
  };
}
