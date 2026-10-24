/**
 * Timezone utilities and predefined timezone list for the Crypto Futures Trading Analyzer.
 */

/**
 * Common major financial and crypto market timezones.
 */
export const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
] as const;

export type TimezoneOption = typeof TIMEZONES[number];
export type TimezoneValue = TimezoneOption['value'];

/**
 * Returns the client system's local IANA timezone name.
 * Falls back to 'UTC' if unavailable.
 *
 * @returns IANA timezone identifier (e.g., 'America/New_York', 'UTC').
 */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Converts a Unix timestamp in milliseconds or seconds to a Date adjusted
 * for the target timezone representation.
 *
 * @param timestampMs - Unix epoch timestamp (ms or s).
 * @param timezone - Target IANA timezone identifier.
 * @returns A Date object representing the time in the specified timezone.
 */
export function convertTimestamp(timestampMs: number, timezone: string): Date {
  const ms = timestampMs < 1e11 ? timestampMs * 1000 : timestampMs;
  const baseDate = new Date(ms);

  if (isNaN(baseDate.getTime())) {
    return new Date(NaN);
  }

  try {
    const tzString = baseDate.toLocaleString('en-US', { timeZone: timezone });
    const converted = new Date(tzString);
    return isNaN(converted.getTime()) ? baseDate : converted;
  } catch {
    return baseDate;
  }
}

/**
 * Formats a Date object for a specific target timezone with format presets.
 *
 * @param date - The Date object to format.
 * @param timezone - Target IANA timezone identifier (e.g. 'UTC', 'Asia/Tokyo').
 * @param format - Preset format: 'full' (date + time), 'short' (date only), or 'time' (time only). Defaults to 'full'.
 * @returns Formatted date/time string.
 */
export function formatDateForTimezone(
  date: Date,
  timezone: string,
  format: 'full' | 'short' | 'time' = 'full'
): string {
  if (isNaN(date.getTime())) {
    return '-';
  }

  let options: Intl.DateTimeFormatOptions;

  switch (format) {
    case 'short':
      options = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      };
      break;
    case 'time':
      options = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      break;
    case 'full':
    default:
      options = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      break;
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timezone,
    }).format(date);
  } catch {
    // If timezone string is invalid, fallback without timeZone option
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}
