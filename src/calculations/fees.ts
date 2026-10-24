/**
 * Trading fees and funding rate calculations for crypto futures.
 */

/**
 * Interface representing trading fee and funding rate configuration.
 */
export interface FeeConfig {
  makerRate: number;
  takerRate: number;
  fundingRate?: number;
}

export const DEFAULT_MAKER_FEE_RATE = 0.0002; // 0.02%
export const DEFAULT_TAKER_FEE_RATE = 0.0004; // 0.04%

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  makerRate: DEFAULT_MAKER_FEE_RATE,
  takerRate: DEFAULT_TAKER_FEE_RATE,
  fundingRate: 0,
};

export type OrderFeeType = 'maker' | 'taker';

/**
 * Calculates a single trading fee for a position given a fee rate.
 *
 * Formula: positionSize × feeRate
 *
 * @param positionSize - Position size (notional value) in USDT.
 * @param feeRate - Fee rate multiplier (e.g., 0.0002 for 0.02%, 0.0004 for 0.04%).
 * @returns Trading fee in USDT. Returns 0 if positionSize or feeRate <= 0.
 */
export function calcTradingFee(positionSize: number, feeRate: number): number {
  if (positionSize <= 0 || feeRate <= 0 || !Number.isFinite(positionSize) || !Number.isFinite(feeRate)) {
    return 0;
  }
  return positionSize * feeRate;
}

/**
 * Calculates total round-trip fees for opening and closing a position.
 * By default, entry and exit orders are treated as taker orders.
 *
 * @param positionSize - Position size in USDT.
 * @param makerRate - Maker fee rate (default: 0.0002).
 * @param takerRate - Taker fee rate (default: 0.0004).
 * @param entryType - Entry order fee type ('maker' | 'taker', default: 'taker').
 * @param exitType - Exit order fee type ('maker' | 'taker', default: 'taker').
 * @returns Total round-trip fee in USDT. Returns 0 if positionSize <= 0.
 */
export function calcRoundTripFees(
  positionSize: number,
  makerRate: number = DEFAULT_MAKER_FEE_RATE,
  takerRate: number = DEFAULT_TAKER_FEE_RATE,
  entryType: OrderFeeType = 'taker',
  exitType: OrderFeeType = 'taker'
): number {
  if (positionSize <= 0 || !Number.isFinite(positionSize)) {
    return 0;
  }

  const entryRate = entryType === 'maker' ? makerRate : takerRate;
  const exitRate = exitType === 'maker' ? makerRate : takerRate;

  return calcTradingFee(positionSize, entryRate) + calcTradingFee(positionSize, exitRate);
}

/**
 * Calculates funding payment for a position given a funding rate.
 *
 * Formula: positionSize × fundingRate
 *
 * @param positionSize - Position size in USDT.
 * @param fundingRate - Funding rate for the period (e.g., 0.0001 for +0.01%).
 * @returns Funding payment in USDT.
 */
export function calcFundingPayment(positionSize: number, fundingRate: number): number {
  if (positionSize <= 0 || fundingRate === 0 || !Number.isFinite(positionSize) || !Number.isFinite(fundingRate)) {
    return 0;
  }
  return positionSize * fundingRate;
}
