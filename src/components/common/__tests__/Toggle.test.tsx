import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from '../Toggle';

describe('Toggle', () => {
  it('renders options and highlights selected value', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'LONG', label: 'LONG' },
      { value: 'SHORT', label: 'SHORT' },
    ];

    render(
      <Toggle
        options={options}
        value="LONG"
        onChange={handleChange}
      />
    );

    const longBtn = screen.getByText('LONG');
    const shortBtn = screen.getByText('SHORT');

    expect(longBtn.getAttribute('aria-pressed')).toBe('true');
    expect(shortBtn.getAttribute('aria-pressed')).toBe('false');

    // Should have green highlight for LONG
    expect(longBtn.className).toContain('bg-emerald-600');
  });

  it('highlights SHORT with red styling', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'LONG', label: 'LONG' },
      { value: 'SHORT', label: 'SHORT' },
    ];

    render(
      <Toggle
        options={options}
        value="SHORT"
        onChange={handleChange}
      />
    );

    const shortBtn = screen.getByText('SHORT');
    expect(shortBtn.getAttribute('aria-pressed')).toBe('true');
    expect(shortBtn.className).toContain('bg-rose-600');
  });

  it('triggers onChange with selected option value', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'isolated', label: 'Isolated' },
      { value: 'cross', label: 'Cross' },
    ];

    render(
      <Toggle
        options={options}
        value="isolated"
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByText('Cross'));
    expect(handleChange).toHaveBeenCalledWith('cross');
  });
});
