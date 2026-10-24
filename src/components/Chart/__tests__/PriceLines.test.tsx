import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PriceLines } from '../PriceLines';
import type { ISeriesApi, IPriceLine } from 'lightweight-charts';

describe('PriceLines', () => {
  it('creates entry price line and enabled scenario price lines on the series', () => {
    const createdLines: Array<{ id: number; options: unknown }> = [];
    const removedLines: unknown[] = [];
    let idCounter = 1;

    const mockSeries = {
      createPriceLine: vi.fn((opts) => {
        const entry = { id: idCounter++, options: opts };
        const line = entry as unknown as IPriceLine;
        createdLines.push(entry);
        return line;
      }),
      removePriceLine: vi.fn((line) => {
        removedLines.push(line);
      }),
    } as unknown as ISeriesApi<'Candlestick'>;

    const { unmount } = render(
      <PriceLines
        chart={null}
        series={mockSeries}
        entryPrice={80000}
        margin={10}
        leverage={10}
        direction="LONG"
        enabledLines={[-5, 5]}
      />
    );

    // 1 Entry line + 2 scenario lines (-5% and +5%) = 3 lines total
    expect(mockSeries.createPriceLine).toHaveBeenCalledTimes(3);

    // Check Entry Line
    expect(createdLines[0].options).toMatchObject({
      price: 80000,
      color: '#3b82f6',
      title: 'Entry',
    });

    // Check -5% line (Loss for LONG -> #ef4444)
    expect(createdLines[1].options).toMatchObject({
      price: 76000, // 80000 * 0.95
      color: '#ef4444',
      title: expect.stringContaining('-5%'),
    });

    // Check +5% line (Profit for LONG -> #22c55e)
    expect(createdLines[2].options).toMatchObject({
      price: 84000, // 80000 * 1.05
      color: '#22c55e',
      title: expect.stringContaining('+5%'),
    });

    // On unmount, all lines should be removed
    unmount();
    expect(mockSeries.removePriceLine).toHaveBeenCalledTimes(3);
  });

  it('inverts profit/loss colors for SHORT positions', () => {
    const createdLines: Array<{ options: { color: string } }> = [];

    const mockSeries = {
      createPriceLine: vi.fn((opts) => {
        const entry = { options: opts };
        const line = entry as unknown as IPriceLine;
        createdLines.push(entry as { options: { color: string } });
        return line;
      }),
      removePriceLine: vi.fn(),
    } as unknown as ISeriesApi<'Candlestick'>;

    render(
      <PriceLines
        chart={null}
        series={mockSeries}
        entryPrice={80000}
        margin={10}
        leverage={10}
        direction="SHORT"
        enabledLines={[-5, 5]}
      />
    );

    // Line 0 is entry, Line 1 is -5%, Line 2 is +5%
    // For SHORT: -5% is profit (#22c55e), +5% is loss (#ef4444)
    expect(createdLines[1].options.color).toBe('#22c55e');
    expect(createdLines[2].options.color).toBe('#ef4444');
  });

  it('does nothing if series or entryPrice is null or non-positive', () => {
    const mockSeries = {
      createPriceLine: vi.fn(),
      removePriceLine: vi.fn(),
    } as unknown as ISeriesApi<'Candlestick'>;

    render(
      <PriceLines
        chart={null}
        series={mockSeries}
        entryPrice={0}
        margin={10}
        leverage={10}
        direction="LONG"
        enabledLines={[5]}
      />
    );

    expect(mockSeries.createPriceLine).not.toHaveBeenCalled();
  });
});
