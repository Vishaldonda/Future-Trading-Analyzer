import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  formatBtcPrice,
  formatCompact,
  formatUsdt,
  formatTimestamp,
  formatVolume,
} from '../formatting';

describe('formatCurrency', () => {
  it('formats regular amounts as USD currency', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(80000)).toBe('$80,000.00');
    expect(formatCurrency(10)).toBe('$10.00');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('handles negative currency amounts', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
    expect(formatCurrency(-50)).toBe('-$50.00');
  });

  it('handles custom decimal precision', () => {
    expect(formatCurrency(1234.5678, 4)).toBe('$1,234.5678');
    expect(formatCurrency(1234.5, 0)).toBe('$1,235');
  });

  it('handles small fractional values below 1 with extra precision', () => {
    expect(formatCurrency(0.00012345)).toBe('$0.00012345');
    expect(formatCurrency(0.05)).toBe('$0.0500');
  });

  it('handles non-finite edge cases gracefully', () => {
    expect(formatCurrency(NaN)).toBe('$0.00');
    expect(formatCurrency(Infinity)).toBe('$0.00');
    expect(formatCurrency(-Infinity)).toBe('$0.00');
  });
});

describe('formatPercentage', () => {
  it('always includes sign for positive values', () => {
    expect(formatPercentage(1.5)).toBe('+1.50%');
    expect(formatPercentage(10)).toBe('+10.00%');
    expect(formatPercentage(0.05)).toBe('+0.05%');
  });

  it('formats negative percentages correctly', () => {
    expect(formatPercentage(-3.2)).toBe('-3.20%');
    expect(formatPercentage(-10)).toBe('-10.00%');
  });

  it('formats zero with a sign', () => {
    expect(formatPercentage(0)).toBe('+0.00%');
  });

  it('respects custom decimal places', () => {
    expect(formatPercentage(1.2346, 3)).toBe('+1.235%');
    expect(formatPercentage(-2.5, 1)).toBe('-2.5%');
    expect(formatPercentage(5, 0)).toBe('+5%');
  });

  it('handles non-finite values safely', () => {
    expect(formatPercentage(NaN)).toBe('+0.00%');
    expect(formatPercentage(Infinity)).toBe('+0.00%');
  });
});

describe('formatBtcPrice', () => {
  it('formats prices above 100 with 2 decimals', () => {
    expect(formatBtcPrice(80000)).toBe('80,000.00');
    expect(formatBtcPrice(64523.5)).toBe('64,523.50');
    expect(formatBtcPrice(101)).toBe('101.00');
  });

  it('formats prices <= 100 with higher precision', () => {
    expect(formatBtcPrice(50.123456)).toBe('50.123456');
    expect(formatBtcPrice(0.00045678)).toBe('0.00045678');
    expect(formatBtcPrice(1.5)).toBe('1.50');
  });

  it('handles edge cases safely', () => {
    expect(formatBtcPrice(NaN)).toBe('0.00');
    expect(formatBtcPrice(-500)).toBe('-500.00');
  });
});

describe('formatCompact', () => {
  it('formats thousands with K suffix', () => {
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(10000)).toBe('10K');
    expect(formatCompact(999900)).toBe('999.9K');
  });

  it('formats millions with M suffix', () => {
    expect(formatCompact(1500000)).toBe('1.5M');
    expect(formatCompact(25400000)).toBe('25.4M');
  });

  it('formats billions and trillions', () => {
    expect(formatCompact(1230000000)).toBe('1.23B');
    expect(formatCompact(2500000000000)).toBe('2.5T');
  });

  it('formats numbers below 1000 without suffix', () => {
    expect(formatCompact(500)).toBe('500');
    expect(formatCompact(42.5)).toBe('42.5');
    expect(formatCompact(0)).toBe('0');
  });

  it('handles negative compact numbers', () => {
    expect(formatCompact(-2500000)).toBe('-2.5M');
    expect(formatCompact(-1200)).toBe('-1.2K');
  });

  it('handles non-finite values safely', () => {
    expect(formatCompact(NaN)).toBe('0');
  });
});

describe('formatUsdt', () => {
  it('formats amounts with USDT suffix', () => {
    expect(formatUsdt(10)).toBe('10.00 USDT');
    expect(formatUsdt(1234.56)).toBe('1,234.56 USDT');
    expect(formatUsdt(0)).toBe('0.00 USDT');
  });

  it('handles custom decimals', () => {
    expect(formatUsdt(10.555, 3)).toBe('10.555 USDT');
    expect(formatUsdt(10.5, 0)).toBe('11 USDT');
  });

  it('handles non-finite values safely', () => {
    expect(formatUsdt(NaN)).toBe('0.00 USDT');
  });
});

describe('formatTimestamp', () => {
  it('formats millisecond timestamps with UTC', () => {
    const ts = 1710000000000; // 2024-03-09T16:00:00.000Z
    const formatted = formatTimestamp(ts, 'UTC');
    expect(formatted).toContain('2024');
    expect(formatted).toContain('16:00:00');
  });

  it('supports second-based timestamps', () => {
    const tsSeconds = 1710000000;
    const formatted = formatTimestamp(tsSeconds, 'UTC');
    expect(formatted).toContain('2024');
  });

  it('formats with specific timezones', () => {
    const ts = 1710000000000; // 16:00:00 UTC -> 11:00:00 EDT (America/New_York)
    const formatted = formatTimestamp(ts, 'America/New_York');
    expect(formatted).toContain('11:00:00');
  });

  it('handles invalid timestamps safely', () => {
    expect(formatTimestamp(0)).toBe('-');
    expect(formatTimestamp(-1)).toBe('-');
    expect(formatTimestamp(NaN)).toBe('-');
  });

  it('handles invalid timezone strings gracefully', () => {
    const ts = 1710000000000;
    const formatted = formatTimestamp(ts, 'Invalid/Timezone_Name');
    expect(formatted).not.toBe('-');
    expect(formatted).toContain('2024');
  });
});

describe('formatVolume', () => {
  it('formats small volume without suffix', () => {
    expect(formatVolume(50)).toBe('50');
    expect(formatVolume(123.45)).toBe('123.45');
    expect(formatVolume(0)).toBe('0');
  });

  it('formats large volume with compact suffixes', () => {
    expect(formatVolume(1500000)).toBe('1.5M');
    expect(formatVolume(45000)).toBe('45K');
  });

  it('handles non-finite values', () => {
    expect(formatVolume(NaN)).toBe('0');
  });
});
