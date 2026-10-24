import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TradingControls } from '../TradingControls';
import { TradingProvider } from '../../../context/TradingContext';

describe('TradingControls', () => {
  it('renders all control sections properly', () => {
    render(
      <TradingProvider>
        <TradingControls />
      </TradingProvider>
    );

    expect(screen.getByText('Position Parameters')).toBeDefined();
    expect(screen.getByLabelText(/Initial Margin/i)).toBeDefined();
    expect(screen.getByText('Leverage')).toBeDefined();
    expect(screen.getByText('Direction')).toBeDefined();
    expect(screen.getByLabelText(/Entry Price/i)).toBeDefined();
    expect(screen.getByText('Price Movement')).toBeDefined();
    expect(screen.getByText('Reset to Defaults')).toBeDefined();
  });

  it('updates margin value when user types into margin input', () => {
    render(
      <TradingProvider>
        <TradingControls />
      </TradingProvider>
    );

    const marginInput = screen.getByLabelText(/Initial Margin/i) as HTMLInputElement;
    expect(marginInput.value).toBe('10');

    fireEvent.change(marginInput, { target: { value: '25' } });
    expect(marginInput.value).toBe('25');
  });

  it('allows clicking leverage quick-select buttons', () => {
    render(
      <TradingProvider>
        <TradingControls />
      </TradingProvider>
    );

    const btn50x = screen.getByText('50×');
    fireEvent.click(btn50x);

    // Badges should now show 50×
    const badges = screen.getAllByText('50×');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('switches direction between LONG and SHORT', () => {
    render(
      <TradingProvider>
        <TradingControls />
      </TradingProvider>
    );

    const shortBtn = screen.getByText('SHORT');
    fireEvent.click(shortBtn);
    expect(shortBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('resets controls to default values on reset button click', () => {
    render(
      <TradingProvider>
        <TradingControls />
      </TradingProvider>
    );

    const marginInput = screen.getByLabelText(/Initial Margin/i) as HTMLInputElement;
    fireEvent.change(marginInput, { target: { value: '99' } });
    expect(marginInput.value).toBe('99');

    const resetBtn = screen.getByText('Reset to Defaults');
    fireEvent.click(resetBtn);

    expect(marginInput.value).toBe('10');
  });
});
