import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeeSettings } from '../FeeSettings';
import { TradingProvider } from '../../../context/TradingContext';

describe('FeeSettings', () => {
  it('toggles collapsible accordion when clicking header', () => {
    render(
      <TradingProvider>
        <FeeSettings defaultOpen={false} />
      </TradingProvider>
    );

    expect(screen.queryByLabelText(/Maker Fee Rate/i)).toBeNull();

    fireEvent.click(screen.getByText('Fee & Funding Settings'));
    expect(screen.getByLabelText(/Maker Fee Rate/i)).toBeDefined();
    expect(screen.getByLabelText(/Taker Fee Rate/i)).toBeDefined();
  });

  it('updates fee rates and resets to defaults', () => {
    render(
      <TradingProvider>
        <FeeSettings defaultOpen={true} />
      </TradingProvider>
    );

    const makerInput = screen.getByLabelText(/Maker Fee Rate/i) as HTMLInputElement;
    expect(makerInput.value).toBe('0.02');

    fireEvent.change(makerInput, { target: { value: '0.05' } });
    expect(makerInput.value).toBe('0.05');

    const resetBtn = screen.getByText('Reset Fees');
    fireEvent.click(resetBtn);
    expect(makerInput.value).toBe('0.02');
  });
});
