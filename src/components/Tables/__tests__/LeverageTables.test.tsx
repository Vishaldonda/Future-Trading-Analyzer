import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeverageTables } from '../LeverageTables';
import { TradingProvider } from '../../../context/TradingContext';

function renderWithProvider() {
  return render(
    <TradingProvider>
      <LeverageTables />
    </TradingProvider>
  );
}

describe('LeverageTables', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders summary statistics and leverage levels 1x to 10x', () => {
    renderWithProvider();

    expect(
      screen.getByText('10 leverage levels × 21 scenarios = 210 calculations')
    ).toBeDefined();

    for (let lev = 1; lev <= 10; lev++) {
      expect(screen.getByText(`${lev}× Leverage`)).toBeDefined();
    }
  });

  it('expands 1x by default, while 2x is collapsed', () => {
    const { container } = renderWithProvider();

    // 1x table should have visible rows
    const tables = container.querySelectorAll('table');
    expect(tables.length).toBe(1);

    // Clicking 2x expands 2x table
    const lev2Header = screen.getByText('2× Leverage');
    fireEvent.click(lev2Header);

    const updatedTables = container.querySelectorAll('table');
    expect(updatedTables.length).toBe(2);
  });

  it('handles Expand All and Collapse All properly', () => {
    const { container } = renderWithProvider();

    const expandAllBtn = screen.getByRole('button', { name: /Expand All/i });
    fireEvent.click(expandAllBtn);

    let tables = container.querySelectorAll('table');
    expect(tables.length).toBe(10);

    const collapseAllBtn = screen.getByRole('button', { name: /Collapse All/i });
    fireEvent.click(collapseAllBtn);

    tables = container.querySelectorAll('table');
    expect(tables.length).toBe(0);
  });

  it('renders Export All as CSV button', () => {
    renderWithProvider();
    const exportAllBtn = screen.getByRole('button', { name: /Export All as CSV/i });
    expect(exportAllBtn).toBeDefined();
  });
});
