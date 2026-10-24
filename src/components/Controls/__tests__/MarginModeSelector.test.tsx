import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarginModeSelector } from '../MarginModeSelector';
import { TradingProvider } from '../../../context/TradingContext';

describe('MarginModeSelector', () => {
  it('renders isolated mode explanation by default in provider', () => {
    render(
      <TradingProvider>
        <MarginModeSelector />
      </TradingProvider>
    );

    expect(screen.getByText('Margin Mode')).toBeDefined();
    expect(
      screen.getByText('Only the allocated margin is at risk. If liquidated, you lose only this margin.')
    ).toBeDefined();
  });

  it('renders cross mode explanation when cross is selected or controlled', () => {
    const handleChange = vi.fn();
    render(
      <TradingProvider>
        <MarginModeSelector value="cross" onChange={handleChange} />
      </TradingProvider>
    );

    expect(
      screen.getByText(
        'All available balance in your account is used as margin. Higher risk of total account liquidation.'
      )
    ).toBeDefined();

    fireEvent.click(screen.getByText('Isolated'));
    expect(handleChange).toHaveBeenCalledWith('isolated');
  });
});
