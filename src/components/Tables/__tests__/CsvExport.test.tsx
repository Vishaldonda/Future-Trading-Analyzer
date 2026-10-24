import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CsvExport } from '../CsvExport';
import { generateScenarioTable } from '../../../calculations/scenarios';

describe('CsvExport', () => {
  const sampleData = generateScenarioTable({
    entryPrice: 80000,
    margin: 10,
    leverage: 10,
  });

  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders button with label and icon', () => {
    render(<CsvExport data={sampleData} label="Export Test" />);
    const btn = screen.getByRole('button', { name: /Export Test/i });
    expect(btn).toBeDefined();
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('disables button when data is empty', () => {
    render(<CsvExport data={[]} label="Empty Export" />);
    const btn = screen.getByRole('button', { name: /Empty Export/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('triggers CSV generation and downloads when clicked', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    render(<CsvExport data={sampleData} filename="custom-test.csv" label="Download" />);
    const btn = screen.getByRole('button', { name: /Download/i });
    fireEvent.click(btn);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
