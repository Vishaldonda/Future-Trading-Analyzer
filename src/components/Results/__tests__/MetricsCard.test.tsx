import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsCard } from '../MetricsCard';

describe('MetricsCard', () => {
  it('renders label, value, sublabel, and tooltip', () => {
    render(
      <MetricsCard
        label="Net P&L"
        value="$125.50"
        sublabel="+12.55%"
        tooltip="Net profit after fees"
        variant="profit"
      />
    );

    expect(screen.getByText('Net P&L')).toBeDefined();
    expect(screen.getByText('$125.50')).toBeDefined();
    expect(screen.getByText('+12.55%')).toBeDefined();
    expect(screen.getByText('Net profit after fees')).toBeDefined();

    const valEl = screen.getByText('$125.50');
    expect(valEl.className).toContain('text-emerald-400');
  });

  it('renders loss and warning variants with appropriate classes', () => {
    const { rerender } = render(
      <MetricsCard label="Loss Metric" value="-$40.00" variant="loss" />
    );
    expect(screen.getByText('-$40.00').className).toContain('text-rose-400');

    rerender(<MetricsCard label="Warning Metric" value="High" variant="warning" />);
    expect(screen.getByText('High').className).toContain('text-amber-400');
  });
});
