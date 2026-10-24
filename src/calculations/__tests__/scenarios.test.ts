import { describe, it, expect } from 'vitest';
import {
  generateScenarioRow,
  generateScenarioTable,
  generateAllLeverageTables,
} from '../scenarios';

describe('Scenario Analysis Calculations', () => {
  it('generates scenario row with correct values for known inputs', () => {
    const row = generateScenarioRow({
      entryPrice: 80000,
      margin: 10,
      leverage: 10,
      percentageMove: 1,
    });

    expect(row.leverage).toBe(10);
    expect(row.margin).toBe(10);
    expect(row.positionSize).toBe(100);
    expect(row.entryPrice).toBe(80000);
    expect(row.movePct).toBe(1);
    expect(row.exitPrice).toBe(80800);

    // Gross P&L & Returns
    expect(row.longGrossPnl).toBe(1);
    expect(row.longReturnPct).toBe(10);
    expect(row.shortGrossPnl).toBe(-1);
    expect(row.shortReturnPct).toBe(-10);

    // Round-trip fee: 100 * 0.0004 * 2 = 0.08 USDT
    // Net P&L:
    // Long: 1 - 0.08 = 0.92
    // Short: -1 - 0.08 = -1.08
    expect(row.estNetPnlLong).toBe(0.92);
    expect(row.estNetPnlShort).toBe(-1.08);

    // Remaining Equity:
    // Long: 10 + 0.92 = 10.92
    // Short: 10 + (-1.08) = 8.92
    expect(row.remainingEquityLong).toBe(10.92);
    expect(row.remainingEquityShort).toBe(8.92);
  });

  it('generates scenario table with exactly 21 rows from -10% to +10%', () => {
    const table = generateScenarioTable({
      entryPrice: 80000,
      margin: 10,
      leverage: 10,
    });

    expect(table).toHaveLength(21);

    // Check bounds and sequence
    expect(table[0].movePct).toBe(-10);
    expect(table[table.length - 1].movePct).toBe(10);

    const moves = table.map((r) => r.movePct);
    const expectedMoves = Array.from({ length: 21 }, (_, i) => i - 10);
    expect(moves).toEqual(expectedMoves);
  });

  it('generates all leverage tables producing 10 tables each with 21 rows', () => {
    const tablesMap = generateAllLeverageTables({
      entryPrice: 80000,
      margin: 10,
    });

    expect(tablesMap.size).toBe(10);

    for (let leverage = 1; leverage <= 10; leverage++) {
      expect(tablesMap.has(leverage)).toBe(true);
      const table = tablesMap.get(leverage);
      expect(table).toBeDefined();
      expect(table).toHaveLength(21);
      expect(table![0].leverage).toBe(leverage);
      expect(table![0].positionSize).toBe(10 * leverage);
    }
  });

  it('ensures 0% move row has 0 gross P&L and 0% return', () => {
    const table = generateScenarioTable({
      entryPrice: 80000,
      margin: 10,
      leverage: 10,
    });

    const zeroRow = table.find((r) => r.movePct === 0);
    expect(zeroRow).toBeDefined();
    expect(zeroRow!.exitPrice).toBe(80000);
    expect(zeroRow!.longGrossPnl).toBe(0);
    expect(zeroRow!.shortGrossPnl).toBe(0);
    expect(zeroRow!.longReturnPct).toBe(0);
    expect(zeroRow!.shortReturnPct).toBe(0);
  });

  it('maintains symmetry: for same absolute %, LONG gain = SHORT loss and vice versa', () => {
    const table = generateScenarioTable({
      entryPrice: 80000,
      margin: 10,
      leverage: 10,
    });

    for (let move = 1; move <= 10; move++) {
      const positiveRow = table.find((r) => r.movePct === move)!;
      const negativeRow = table.find((r) => r.movePct === -move)!;

      // Within the same row: LONG gross P&L is the exact opposite of SHORT gross P&L
      expect(positiveRow.longGrossPnl).toBe(-positiveRow.shortGrossPnl);
      expect(positiveRow.longReturnPct).toBe(-positiveRow.shortReturnPct);

      // Across symmetric moves: LONG gain at +move% equals SHORT gain at -move%
      expect(positiveRow.longGrossPnl).toBe(negativeRow.shortGrossPnl);
      expect(positiveRow.shortGrossPnl).toBe(negativeRow.longGrossPnl);
      expect(positiveRow.longReturnPct).toBe(negativeRow.shortReturnPct);
      expect(positiveRow.shortReturnPct).toBe(negativeRow.longReturnPct);
    }
  });
});
