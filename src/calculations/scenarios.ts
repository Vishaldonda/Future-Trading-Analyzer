/**
 * Scenario analysis matrix generation across price moves and leverage levels.
 */

import {
  calcExitPrice,
  calcGrossPnL,
  calcNetPnL,
  calcPositionSize,
  calcRemainingEquity,
  calcReturnOnMargin,
} from './pnl';
import {
  calcFundingPayment,
  calcRoundTripFees,
  DEFAULT_FEE_CONFIG,
  type FeeConfig,
} from './fees';

/**
 * Representation of a single scenario row in the analysis table.
 */
export interface ScenarioRow {
  leverage: number;
  margin: number;
  positionSize: number;
  entryPrice: number;
  movePct: number;
  exitPrice: number;
  longGrossPnl: number;
  longReturnPct: number;
  shortGrossPnl: number;
  shortReturnPct: number;
  estNetPnlLong: number;
  estNetPnlShort: number;
  remainingEquityLong: number;
  remainingEquityShort: number;
}

export interface GenerateScenarioRowParams {
  entryPrice: number;
  margin: number;
  leverage: number;
  percentageMove: number;
  feeConfig?: FeeConfig;
}

export interface GenerateScenarioTableParams {
  entryPrice: number;
  margin: number;
  leverage: number;
  feeConfig?: FeeConfig;
}

export interface GenerateAllLeverageTablesParams {
  entryPrice: number;
  margin: number;
  feeConfig?: FeeConfig;
}

/**
 * Generates a single scenario row for a specific percentage price move.
 *
 * @param params - Configuration including entry price, margin, leverage, percentageMove, and optional feeConfig.
 * @returns ScenarioRow containing calculated metrics for both LONG and SHORT directions.
 */
export function generateScenarioRow(params: GenerateScenarioRowParams): ScenarioRow {
  const { entryPrice, margin, leverage, percentageMove, feeConfig = DEFAULT_FEE_CONFIG } = params;

  const positionSize = calcPositionSize(margin, leverage);
  const exitPrice = calcExitPrice(entryPrice, percentageMove);

  const longGrossPnl = calcGrossPnL(positionSize, percentageMove, 'LONG');
  const shortGrossPnl = calcGrossPnL(positionSize, percentageMove, 'SHORT');

  const longReturnPct = calcReturnOnMargin(longGrossPnl, margin);
  const shortReturnPct = calcReturnOnMargin(shortGrossPnl, margin);

  const makerRate = feeConfig?.makerRate ?? DEFAULT_FEE_CONFIG.makerRate;
  const takerRate = feeConfig?.takerRate ?? DEFAULT_FEE_CONFIG.takerRate;
  const roundTripFees = calcRoundTripFees(positionSize, makerRate, takerRate);

  const fundingRate = feeConfig?.fundingRate ?? 0;
  const longFunding = calcFundingPayment(positionSize, fundingRate);
  // In perpetual futures, longs pay shorts when funding rate is positive, and vice-versa
  const shortFunding = -longFunding;

  const estNetPnlLong = calcNetPnL(longGrossPnl, roundTripFees, longFunding);
  const estNetPnlShort = calcNetPnL(shortGrossPnl, roundTripFees, shortFunding);

  const remainingEquityLong = calcRemainingEquity(margin, estNetPnlLong);
  const remainingEquityShort = calcRemainingEquity(margin, estNetPnlShort);

  return {
    leverage,
    margin,
    positionSize,
    entryPrice,
    movePct: percentageMove,
    exitPrice,
    longGrossPnl,
    longReturnPct,
    shortGrossPnl,
    shortReturnPct,
    estNetPnlLong,
    estNetPnlShort,
    remainingEquityLong,
    remainingEquityShort,
  };
}

/**
 * Generates a scenario analysis table of 21 rows from -10% to +10% in 1% steps.
 *
 * @param params - Configuration with entryPrice, margin, leverage, and optional feeConfig.
 * @returns Array of 21 ScenarioRow objects.
 */
export function generateScenarioTable(params: GenerateScenarioTableParams): ScenarioRow[] {
  const rows: ScenarioRow[] = [];
  for (let movePct = -10; movePct <= 10; movePct += 1) {
    rows.push(
      generateScenarioRow({
        entryPrice: params.entryPrice,
        margin: params.margin,
        leverage: params.leverage,
        percentageMove: movePct,
        feeConfig: params.feeConfig,
      })
    );
  }
  return rows;
}

/**
 * Generates scenario analysis tables for leverage levels 1x through 10x.
 *
 * @param params - Configuration with entryPrice, margin, and optional feeConfig.
 * @returns Map where keys are leverage multipliers (1 to 10) and values are 21-row scenario tables.
 */
export function generateAllLeverageTables(
  params: GenerateAllLeverageTablesParams
): Map<number, ScenarioRow[]> {
  const tables = new Map<number, ScenarioRow[]>();
  for (let leverage = 1; leverage <= 10; leverage += 1) {
    tables.set(
      leverage,
      generateScenarioTable({
        entryPrice: params.entryPrice,
        margin: params.margin,
        leverage,
        feeConfig: params.feeConfig,
      })
    );
  }
  return tables;
}
