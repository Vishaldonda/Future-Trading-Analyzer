/**
 * Pure functions for profit and loss (P&L), position sizing, and equity calculations
 * for crypto futures trading.
 */

export type TradeDirection = 'LONG' | 'SHORT';

/**
 * Calculates total position size (notional value) based on margin and leverage.
 *
 * Formula: margin × leverage
 *
 * @param margin - Initial margin in USDT. Must be positive.
 * @param leverage - Leverage multiplier (e.g., 10 for 10x). Must be positive.
 * @returns Position size in USDT. Returns 0 if margin or leverage is <= 0.
 */
export function calcPositionSize(margin: number, leverage: number): number {
  if (margin <= 0 || leverage <= 0 || !Number.isFinite(margin) || !Number.isFinite(leverage)) {
    return 0;
  }
  return margin * leverage;
}

/**
 * Calculates price change percentage between entry and exit prices.
 *
 * Formula: ((exit - entry) / entry) × 100
 *
 * @param entryPrice - Entry price in USDT.
 * @param exitPrice - Exit price in USDT.
 * @returns Percentage change. Returns 0 if entry price <= 0.
 */
export function calcPriceChange(entryPrice: number, exitPrice: number): number {
  if (entryPrice <= 0 || !Number.isFinite(entryPrice) || !Number.isFinite(exitPrice)) {
    return 0;
  }
  const pct = ((exitPrice - entryPrice) / entryPrice) * 100;
  return pct === 0 ? 0 : pct;
}

/**
 * Calculates exit price given an entry price and a percentage move.
 *
 * Formula: entryPrice × (1 + percentageMove / 100)
 *
 * @param entryPrice - Entry price in USDT.
 * @param percentageMove - Percentage move (e.g., +1 for +1%, -5 for -5%).
 * @returns Exit price in USDT. Returns 0 if entryPrice <= 0.
 */
export function calcExitPrice(entryPrice: number, percentageMove: number): number {
  if (entryPrice <= 0 || !Number.isFinite(entryPrice) || !Number.isFinite(percentageMove)) {
    return 0;
  }
  return entryPrice * (1 + percentageMove / 100);
}

/**
 * Calculates gross profit and loss (P&L) without deducting fees or funding.
 *
 * Formula: positionSize × (priceChangePct / 100) × direction
 * where LONG direction = +1, SHORT direction = -1.
 *
 * @param positionSize - Position size (notional) in USDT.
 * @param priceChangePct - Percentage price change of the underlying asset.
 * @param direction - 'LONG' or 'SHORT'.
 * @returns Gross P&L in USDT. Returns 0 if position size <= 0 or price change is 0.
 */
export function calcGrossPnL(
  positionSize: number,
  priceChangePct: number,
  direction: TradeDirection
): number {
  if (
    positionSize <= 0 ||
    priceChangePct === 0 ||
    !Number.isFinite(positionSize) ||
    !Number.isFinite(priceChangePct)
  ) {
    return 0;
  }

  const multiplier = direction === 'LONG' ? 1 : -1;
  const pnl = positionSize * (priceChangePct / 100) * multiplier;
  return pnl === 0 ? 0 : pnl;
}

/**
 * Calculates Return on Margin (ROM) as a percentage.
 *
 * Formula: (pnl / margin) × 100
 *
 * @param pnl - Net or Gross profit and loss in USDT.
 * @param margin - Initial margin allocated to the position.
 * @returns Return on margin percentage. Returns 0 if margin <= 0.
 */
export function calcReturnOnMargin(pnl: number, margin: number): number {
  if (margin <= 0 || !Number.isFinite(margin) || !Number.isFinite(pnl) || pnl === 0) {
    return 0;
  }
  const rom = (pnl / margin) * 100;
  return rom === 0 ? 0 : rom;
}

/**
 * Calculates net profit and loss after deducting trading fees and funding payments.
 *
 * Formula: grossPnl - totalFees - funding
 *
 * @param grossPnl - Gross P&L in USDT.
 * @param totalFees - Round-trip or total trading fees in USDT.
 * @param funding - Total funding payment in USDT (positive = cost, negative = rebate).
 * @returns Net P&L in USDT.
 */
export function calcNetPnL(grossPnl: number, totalFees: number, funding: number = 0): number {
  const safeGross = Number.isFinite(grossPnl) ? grossPnl : 0;
  const safeFees = Number.isFinite(totalFees) ? totalFees : 0;
  const safeFunding = Number.isFinite(funding) ? funding : 0;
  const net = safeGross - safeFees - safeFunding;
  return net === 0 ? 0 : net;
}

/**
 * Calculates remaining equity after realizing net P&L.
 *
 * Formula: margin + netPnl
 *
 * @param margin - Initial margin in USDT.
 * @param netPnl - Net P&L in USDT.
 * @returns Remaining equity in USDT.
 */
export function calcRemainingEquity(margin: number, netPnl: number): number {
  const safeMargin = Number.isFinite(margin) ? margin : 0;
  const safeNet = Number.isFinite(netPnl) ? netPnl : 0;
  return safeMargin + safeNet;
}

/**
 * Calculates notional value from entry price and asset quantity.
 *
 * Formula: entryPrice × quantity
 *
 * @param entryPrice - Price per unit in USDT.
 * @param quantity - Quantity of the asset (e.g. BTC).
 * @returns Notional value in USDT. Returns 0 if inputs are non-positive.
 */
export function calcNotionalValue(entryPrice: number, quantity: number): number {
  if (entryPrice <= 0 || quantity <= 0 || !Number.isFinite(entryPrice) || !Number.isFinite(quantity)) {
    return 0;
  }
  return entryPrice * quantity;
}

/**
 * Calculates asset quantity from position size and entry price.
 *
 * Formula: positionSize / entryPrice
 *
 * @param positionSize - Total position size in USDT.
 * @param entryPrice - Entry price in USDT.
 * @returns Quantity of underlying asset. Returns 0 if entry price <= 0.
 */
export function calcQuantity(positionSize: number, entryPrice: number): number {
  if (entryPrice <= 0 || positionSize <= 0 || !Number.isFinite(entryPrice) || !Number.isFinite(positionSize)) {
    return 0;
  }
  return positionSize / entryPrice;
}
