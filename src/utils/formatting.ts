/**
 * Formatting utilities for numbers, currencies, percentages, timestamps,
 * and volumes in the Crypto Futures Trading Analyzer.
 */

/**
 * Format a number as USD currency: $1,234.56 or -$1,234.56.
 *
 * Uses toLocaleString with USD conventions. Handles very small and very large values.
 * Default is 2 decimal places for values >= 1, and up to 8 decimal places for values < 1.
 *
 * @param value - The numeric value to format.
 * @param decimals - Optional fixed decimal places override.
 * @returns Formatted currency string.
 */
export function formatCurrency(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) {
    return '$0.00';
  }

  const abs = Math.abs(value);
  let fracDigits: number;

  if (decimals !== undefined) {
    fracDigits = Math.max(0, Math.min(20, decimals));
  } else if (abs === 0) {
    fracDigits = 2;
  } else if (abs >= 1) {
    fracDigits = 2;
  } else if (abs >= 0.01) {
    fracDigits = 4;
  } else {
    fracDigits = 8;
  }

  const formattedAbs = abs.toLocaleString('en-US', {
    minimumFractionDigits: fracDigits,
    maximumFractionDigits: fracDigits,
  });

  // Check if rounding made a negative value round to 0
  if (value < 0 && Number(formattedAbs.replace(/,/g, '')) !== 0) {
    return `-$${formattedAbs}`;
  }

  return `$${formattedAbs}`;
}

/**
 * Format a number as a percentage: +1.50% or -3.20%.
 *
 * Always displays a sign (+ or -), defaulting to 2 decimal places.
 *
 * @param value - The percentage value (e.g., 1.5 for +1.50%, -3.2 for -3.20%).
 * @param decimals - Decimal places (default: 2).
 * @returns Formatted signed percentage string.
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) {
    return '+0.00%';
  }

  const precision = Math.max(0, Math.min(20, decimals));
  const absFormatted = Math.abs(value).toFixed(precision);
  const sign = value < 0 ? '-' : '+';

  return `${sign}${absFormatted}%`;
}

/**
 * Format BTC price with appropriate precision.
 *
 * 2 decimals for prices > 100, up to 8 decimals for small prices.
 *
 * @param value - BTC / pair price.
 * @returns Formatted price string.
 */
export function formatBtcPrice(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.00';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs > 100) {
    return `${sign}${abs.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${sign}${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })}`;
}

/**
 * Format large numbers with K, M, B, T suffixes.
 *
 * @param value - The number to format.
 * @returns Compact formatted string (e.g. "1.5M", "10K", "2.35B").
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e12) {
    const formatted = (abs / 1e12).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}${formatted}T`;
  }
  if (abs >= 1e9) {
    const formatted = (abs / 1e9).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}${formatted}B`;
  }
  if (abs >= 1e6) {
    const formatted = (abs / 1e6).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}${formatted}M`;
  }
  if (abs >= 1e3) {
    const formatted = (abs / 1e3).toFixed(2).replace(/\.?0+$/, '');
    return `${sign}${formatted}K`;
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Format USDT amount with 'USDT' suffix.
 *
 * @param value - Amount in USDT.
 * @param decimals - Decimal places (default: 2).
 * @returns Formatted USDT string (e.g. "10.00 USDT").
 */
export function formatUsdt(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) {
    return `0.00 USDT`;
  }

  const precision = Math.max(0, Math.min(20, decimals));
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  return `${formatted} USDT`;
}

/**
 * Format a timestamp to a readable date/time string.
 * Supports UTC and custom IANA timezones using Intl.DateTimeFormat.
 *
 * @param timestamp - Timestamp in milliseconds or seconds.
 * @param timezone - Optional IANA timezone identifier (e.g. 'UTC', 'America/New_York').
 * @returns Formatted readable date string.
 */
export function formatTimestamp(timestamp: number, timezone?: string): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '-';
  }

  // Convert second-based timestamps (10 digits) to milliseconds (13 digits)
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);

  if (isNaN(date.getTime())) {
    return '-';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  if (timezone) {
    try {
      options.timeZone = timezone;
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch {
      // If timezone is invalid, fallback to default local timezone
      delete options.timeZone;
    }
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format volume figures with compact notation for large values.
 *
 * @param value - Volume amount.
 * @returns Formatted volume string.
 */
export function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return '0';
  }

  const abs = Math.abs(value);
  if (abs >= 1000) {
    return formatCompact(value);
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
