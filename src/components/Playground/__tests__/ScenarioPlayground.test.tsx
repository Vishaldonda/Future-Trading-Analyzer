import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioPlayground } from '../ScenarioPlayground';

describe('ScenarioPlayground', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders position parameters and simulation results panels', () => {
    render(<ScenarioPlayground />);

    expect(screen.getByText('Futures Scenario Playground')).toBeDefined();
    expect(screen.getByText('Position Parameters')).toBeDefined();
    expect(screen.getByText('Simulation Results')).toBeDefined();
  });

  it('computes initial calculations with default inputs (Margin 10, Lev 10x, +1% move)', () => {
    render(<ScenarioPlayground />);

    // Position size: 10 * 10 = $100.00
    expect(screen.getByText('$100.00')).toBeDefined();

    // Gross P&L: 100 * 1% = +$1.00 (in Gross P&L card and quick snapshot)
    expect(screen.getAllByText('$1.00').length).toBeGreaterThanOrEqual(1);

    // Round-trip fees: 100 * (0.0004 + 0.0004) = $0.08
    expect(screen.getByText('$0.08')).toBeDefined();

    // Net P&L: 1.00 - 0.08 = $0.92
    expect(screen.getByText('$0.92')).toBeDefined();
  });

  it('toggles direction between LONG and SHORT', () => {
    render(<ScenarioPlayground />);

    const shortBtn = screen.getByRole('button', { name: /SHORT ▼/i });
    fireEvent.click(shortBtn);

    // On +1% move, SHORT has negative gross P&L (-$1.00)
    expect(screen.getAllByText('-$1.00').length).toBeGreaterThanOrEqual(1);
  });

  it('updates price movement when clicking quick scenario snapshots', () => {
    render(<ScenarioPlayground />);

    // Click the button containing "+5%"
    const quick5Btn = screen.getByRole('button', { name: /\+5%/i });
    fireEvent.click(quick5Btn);

    // Gross PnL for 100 pos at +5% = +$5.00
    expect(screen.getAllByText('$5.00').length).toBeGreaterThanOrEqual(1);
  });

  it('resets inputs to defaults when Reset Defaults is clicked', () => {
    render(<ScenarioPlayground />);

    // Change margin to 50 using exact button text
    const marginPreset50 = screen.getByRole('button', { name: /^\$50$/i });
    fireEvent.click(marginPreset50);

    // Position size becomes 500
    expect(screen.getByText('$500.00')).toBeDefined();

    // Click Reset Defaults
    const resetBtn = screen.getByRole('button', { name: /Reset Defaults/i });
    fireEvent.click(resetBtn);

    // Restores default margin 10 -> pos size $100.00
    expect(screen.getByText('$100.00')).toBeDefined();
  });
});
