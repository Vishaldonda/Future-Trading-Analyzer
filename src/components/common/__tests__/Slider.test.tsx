import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from '../Slider';

describe('Slider', () => {
  it('renders label, min, max, and current value', () => {
    const handleChange = vi.fn();
    render(
      <Slider
        min={1}
        max={100}
        step={1}
        value={25}
        onChange={handleChange}
        label="Leverage"
        formatValue={(v) => `${v}×`}
      />
    );

    expect(screen.getByText('Leverage')).toBeDefined();
    expect(screen.getByText('1×')).toBeDefined();
    expect(screen.getByText('100×')).toBeDefined();
    // Badges
    const badges = screen.getAllByText('25×');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('triggers onChange when slider input changes', () => {
    const handleChange = vi.fn();
    render(
      <Slider
        min={0}
        max={100}
        step={5}
        value={50}
        onChange={handleChange}
      />
    );

    const rangeInput = screen.getByRole('slider');
    fireEvent.change(rangeInput, { target: { value: '75' } });

    expect(handleChange).toHaveBeenCalledWith(75);
  });

  it('renders tick marks and handles click', () => {
    const handleChange = vi.fn();
    render(
      <Slider
        min={0}
        max={100}
        step={1}
        value={10}
        onChange={handleChange}
        marks={[0, 25, 50, 75, 100]}
      />
    );

    const markBtn = screen.getByTitle('Set to 50');
    fireEvent.click(markBtn);

    expect(handleChange).toHaveBeenCalledWith(50);
  });

  it('handles edge case invalid values gracefully', () => {
    const handleChange = vi.fn();
    render(
      <Slider
        min={NaN}
        max={NaN}
        step={0}
        value={NaN}
        onChange={handleChange}
      />
    );

    const rangeInput = screen.getByRole('slider');
    expect(rangeInput).toBeDefined();
  });
});
