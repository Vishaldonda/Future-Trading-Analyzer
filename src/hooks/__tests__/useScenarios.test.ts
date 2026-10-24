import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useScenarios } from '../useScenarios';

describe('useScenarios', () => {
  it('generates 21 scenario rows and 10 leverage tables for valid inputs', () => {
    const { result } = renderHook(() => useScenarios(50000, 100, 10));

    expect(result.current.scenarios).toHaveLength(21);
    expect(result.current.allTables.size).toBe(10);

    // Verify 0% move row
    const zeroMoveRow = result.current.scenarios.find((r) => r.movePct === 0);
    expect(zeroMoveRow).toBeDefined();
    expect(zeroMoveRow?.exitPrice).toBe(50000);
    expect(zeroMoveRow?.positionSize).toBe(1000); // 100 * 10
    expect(zeroMoveRow?.longGrossPnl).toBe(0);

    // Verify all 1x-10x tables exist and have 21 rows
    for (let lev = 1; lev <= 10; lev++) {
      const table = result.current.allTables.get(lev);
      expect(table).toBeDefined();
      expect(table).toHaveLength(21);
    }
  });

  it('handles zero or negative entry parameters gracefully', () => {
    const { result } = renderHook(() => useScenarios(0, 100, 10));
    expect(result.current.scenarios).toHaveLength(0);
    expect(result.current.allTables.size).toBe(0);

    const { result: negResult } = renderHook(() => useScenarios(50000, -10, 10));
    expect(negResult.current.scenarios).toHaveLength(0);
    expect(negResult.current.allTables.size).toBe(0);
  });

  it('reacts to changes in leverage and feeConfig', () => {
    let leverage = 5;
    const { result, rerender } = renderHook(() =>
      useScenarios(60000, 50, leverage, { makerRate: 0.0001, takerRate: 0.0002 })
    );

    expect(result.current.scenarios[0].leverage).toBe(5);
    expect(result.current.scenarios[0].positionSize).toBe(250); // 50 * 5

    leverage = 20;
    rerender();

    expect(result.current.scenarios[0].leverage).toBe(20);
    expect(result.current.scenarios[0].positionSize).toBe(1000); // 50 * 20
  });
});
