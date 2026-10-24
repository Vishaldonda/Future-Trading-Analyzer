/**
 * React hook to compute P&L scenario tables across price moves and leverage levels.
 */

import { useMemo } from 'react';
import type { FeeConfig } from '../calculations/fees';
import {
  generateAllLeverageTables,
  generateScenarioTable,
  type ScenarioRow,
} from '../calculations/scenarios';

export interface UseScenariosResult {
  /** 21 scenario rows (-10% to +10%) for the currently selected leverage */
  scenarios: ScenarioRow[];
  /** Map of leverage multiplier (1 to 10) to 21 scenario rows */
  allTables: Map<number, ScenarioRow[]>;
}

/**
 * Computes scenario analysis tables reactively based on trade configuration.
 *
 * @param entryPrice - Position entry price in USDT.
 * @param margin - Initial margin in USDT.
 * @param leverage - Leverage multiplier.
 * @param feeConfig - Optional fee rates (maker/taker) and funding rate.
 * @returns Object with scenarios for active leverage and allTables for 1x-10x tiers.
 */
export function useScenarios(
  entryPrice: number,
  margin: number,
  leverage: number,
  feeConfig?: FeeConfig
): UseScenariosResult {
  const makerRate = feeConfig?.makerRate;
  const takerRate = feeConfig?.takerRate;
  const fundingRate = feeConfig?.fundingRate;

  // Memoize stable fee configuration reference to prevent superfluous calculations
  const memoizedFeeConfig = useMemo(() => {
    if (makerRate === undefined && takerRate === undefined && fundingRate === undefined) {
      return undefined;
    }
    return {
      makerRate: makerRate ?? 0.0002,
      takerRate: takerRate ?? 0.0004,
      fundingRate,
    };
  }, [makerRate, takerRate, fundingRate]);

  // Compute active leverage scenario table (-10% to +10%)
  const scenarios = useMemo(() => {
    if (entryPrice <= 0 || margin <= 0 || leverage <= 0) {
      return [];
    }
    return generateScenarioTable({
      entryPrice,
      margin,
      leverage,
      feeConfig: memoizedFeeConfig,
    });
  }, [entryPrice, margin, leverage, memoizedFeeConfig]);

  // Compute all leverage tiers (1x to 10x) for comparative analysis
  const allTables = useMemo(() => {
    if (entryPrice <= 0 || margin <= 0) {
      return new Map<number, ScenarioRow[]>();
    }
    return generateAllLeverageTables({
      entryPrice,
      margin,
      feeConfig: memoizedFeeConfig,
    });
  }, [entryPrice, margin, memoizedFeeConfig]);

  return {
    scenarios,
    allTables,
  };
}
