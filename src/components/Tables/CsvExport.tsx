import React from 'react';
import Papa from 'papaparse';
import type { ScenarioRow } from '../../calculations/scenarios';

export interface CsvExportProps {
  /** Array of scenario rows to export */
  data: ScenarioRow[];
  /** Optional custom filename for the downloaded CSV file */
  filename?: string;
  /** Optional button label text (defaults to 'Export CSV') */
  label?: string;
  /** Optional extra classes */
  className?: string;
}

/**
 * Button component that serializes scenario data using PapaParse and triggers
 * a direct CSV file download in the browser.
 */
export function CsvExport({
  data,
  filename = 'futures-scenarios.csv',
  label = 'Export CSV',
  className = '',
}: CsvExportProps): React.JSX.Element {
  const handleExport = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event propagation if nested inside an accordion header
    e.stopPropagation();

    if (!data || data.length === 0) {
      return;
    }

    const flatRows = data.map((row) => ({
      'Leverage': `${row.leverage}x`,
      'Margin (USDT)': row.margin,
      'Position Size (USDT)': row.positionSize,
      'Entry Price ($)': row.entryPrice,
      'Price Move (%)': row.movePct,
      'Exit Price ($)': row.exitPrice,
      'Long Gross PnL ($)': row.longGrossPnl,
      'Long Return (%)': row.longReturnPct,
      'Short Gross PnL ($)': row.shortGrossPnl,
      'Short Return (%)': row.shortReturnPct,
      'Net PnL Long ($)': row.estNetPnlLong,
      'Net PnL Short ($)': row.estNetPnlShort,
      'Remaining Equity Long ($)': row.remainingEquityLong,
      'Remaining Equity Short ($)': row.remainingEquityShort,
    }));

    const csvString = Papa.unparse(flatRows);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className={`flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 text-sm rounded-lg transition-colors cursor-pointer select-none ${className}`}
      title={label}
    >
      {/* Arrow down to line icon */}
      <svg
        className="w-4 h-4 text-slate-300 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12 12 16.5m0 0L16.5 12M12 16.5V3"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
