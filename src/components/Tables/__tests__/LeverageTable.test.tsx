import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeverageTable } from '../LeverageTable';
import { generateScenarioTable } from '../../../calculations/scenarios';

describe('LeverageTable', () => {
  const sampleRows = generateScenarioTable({
    entryPrice: 80000,
    margin: 10,
    leverage: 10,
  });

  it('renders header bar with leverage, margin, position size, and entry price', () => {
    render(<LeverageTable rows={sampleRows} leverage={10} />);

    expect(screen.getByText('10×')).toBeDefined();
    expect(screen.getByText('10 USDT')).toBeDefined();
    expect(screen.getByText('100 USDT')).toBeDefined();
    expect(screen.getAllByText('$80,000.00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders table columns correctly', () => {
    render(<LeverageTable rows={sampleRows} leverage={10} />);

    expect(screen.getByText('Move %')).toBeDefined();
    expect(screen.getByText('Exit Price')).toBeDefined();
    expect(screen.getByText('LONG P&L')).toBeDefined();
    expect(screen.getByText('LONG Return %')).toBeDefined();
    expect(screen.getByText('SHORT P&L')).toBeDefined();
    expect(screen.getByText('SHORT Return %')).toBeDefined();
    expect(screen.getByText('Net P&L Long')).toBeDefined();
    expect(screen.getByText('Net P&L Short')).toBeDefined();
    expect(screen.getByText('Remaining Equity Long')).toBeDefined();
    expect(screen.getByText('Remaining Equity Short')).toBeDefined();
  });

  it('renders all 21 rows and highlights 0% move row', () => {
    const { container } = render(<LeverageTable rows={sampleRows} leverage={10} />);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(21);

    // Find the 0% move row where the first cell equals +0.00%
    const zeroPercentRow = Array.from(rows).find((r) => {
      const firstCell = r.querySelector('td');
      return firstCell?.textContent?.trim() === '+0.00%';
    });

    expect(zeroPercentRow).toBeDefined();
    expect(zeroPercentRow?.className).toContain('font-medium');
  });

  it('renders empty message when rows array is empty', () => {
    render(<LeverageTable rows={[]} leverage={5} />);
    expect(screen.getByText('No scenario data available.')).toBeDefined();
  });
});
