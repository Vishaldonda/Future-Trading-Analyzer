import { describe, it, expect } from 'vitest';
import {
  TIMEZONES,
  getLocalTimezone,
  convertTimestamp,
  formatDateForTimezone,
} from '../timezone';

describe('TIMEZONES', () => {
  it('contains standard financial timezones including UTC and Asia/Kolkata', () => {
    const values = TIMEZONES.map((t) => t.value);
    expect(values).toContain('UTC');
    expect(values).toContain('America/New_York');
    expect(values).toContain('Asia/Tokyo');
    expect(values).toContain('Asia/Kolkata');
    expect(values).toContain('Europe/London');
    expect(TIMEZONES.length).toBe(12);
  });
});

describe('getLocalTimezone', () => {
  it('returns a non-empty string representing timezone', () => {
    const tz = getLocalTimezone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });
});

describe('convertTimestamp', () => {
  it('converts timestamp to target timezone Date', () => {
    // 2024-03-09T16:00:00.000Z
    const ts = 1710000000000;
    const dateTokyo = convertTimestamp(ts, 'Asia/Tokyo');
    expect(dateTokyo instanceof Date).toBe(true);
    expect(isNaN(dateTokyo.getTime())).toBe(false);
  });

  it('supports second-based timestamps', () => {
    const tsSeconds = 1710000000;
    const date = convertTimestamp(tsSeconds, 'UTC');
    expect(isNaN(date.getTime())).toBe(false);
  });

  it('handles invalid timestamps', () => {
    const date = convertTimestamp(NaN, 'UTC');
    expect(isNaN(date.getTime())).toBe(true);
  });
});

describe('formatDateForTimezone', () => {
  const testDate = new Date('2024-03-09T16:00:00.000Z');

  it('formats full date and time for timezone', () => {
    const formatted = formatDateForTimezone(testDate, 'America/New_York', 'full');
    expect(formatted).toContain('Mar 09, 2024');
    expect(formatted).toContain('11:00:00');
  });

  it('formats short date only', () => {
    const formatted = formatDateForTimezone(testDate, 'America/New_York', 'short');
    expect(formatted).toContain('Mar 09, 2024');
    expect(formatted).not.toContain('11:00:00');
  });

  it('formats time only', () => {
    const formatted = formatDateForTimezone(testDate, 'America/New_York', 'time');
    expect(formatted).toBe('11:00:00');
  });

  it('formats UTC correctly', () => {
    const formatted = formatDateForTimezone(testDate, 'UTC', 'time');
    expect(formatted).toBe('16:00:00');
  });

  it('handles invalid Date objects', () => {
    expect(formatDateForTimezone(new Date(NaN), 'UTC')).toBe('-');
  });

  it('falls back safely on invalid timezone', () => {
    const formatted = formatDateForTimezone(testDate, 'Invalid/Timezone', 'time');
    expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
