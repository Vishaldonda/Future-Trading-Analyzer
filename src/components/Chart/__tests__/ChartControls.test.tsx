import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartControls } from '../ChartControls';
import { TradingProvider, useTradingContext } from '../../../context/TradingContext';

function TestControlsConsumer() {
  const { state } = useTradingContext();
  return (
    <div>
      <ChartControls />
      <span data-testid="current-interval">{state.interval}</span>
      <span data-testid="current-timezone">{state.timezone}</span>
    </div>
  );
}

describe('ChartControls', () => {
  it('renders symbol, interval select, timezone select, and live status', () => {
    render(
      <TradingProvider>
        <ChartControls />
      </TradingProvider>
    );

    expect(screen.getByText('BTCUSDT')).toBeDefined();
    expect(screen.getByText('Perpetual')).toBeDefined();
    expect(screen.getByLabelText(/Candlestick interval/i)).toBeDefined();
    expect(screen.getByLabelText(/Chart display timezone/i)).toBeDefined();
    expect(screen.getByText(/Disconnected/i)).toBeDefined();
  });

  it('updates interval in context when selecting a new timeframe', () => {
    render(
      <TradingProvider>
        <TestControlsConsumer />
      </TradingProvider>
    );

    const intervalSelect = screen.getByLabelText(/Candlestick interval/i) as HTMLSelectElement;
    expect(intervalSelect.value).toBe('1h');

    fireEvent.change(intervalSelect, { target: { value: '15m' } });

    expect(intervalSelect.value).toBe('15m');
    expect(screen.getByTestId('current-interval').textContent).toBe('15m');
  });

  it('updates timezone in context when selecting a new timezone', () => {
    render(
      <TradingProvider>
        <TestControlsConsumer />
      </TradingProvider>
    );

    const timezoneSelect = screen.getByLabelText(/Chart display timezone/i) as HTMLSelectElement;

    fireEvent.change(timezoneSelect, { target: { value: 'Asia/Tokyo' } });

    expect(timezoneSelect.value).toBe('Asia/Tokyo');
    expect(screen.getByTestId('current-timezone').textContent).toBe('Asia/Tokyo');
  });
});
