import { useEffect, useRef } from 'react';
import {
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  LineStyle,
} from 'lightweight-charts';
import { calcExitPrice, calcGrossPnL, calcPositionSize } from '../../calculations/pnl';
import { formatCurrency } from '../../utils/formatting';

export interface PriceLinesProps {
  /** Lightweight Chart instance */
  chart: IChartApi | null;
  /** Active candlestick series instance to draw price lines on */
  series: ISeriesApi<'Candlestick'> | null;
  /** Trade entry price in USDT */
  entryPrice: number;
  /** Allocated initial margin in USDT */
  margin: number;
  /** Leverage multiplier */
  leverage: number;
  /** Trade direction: LONG or SHORT */
  direction: 'LONG' | 'SHORT';
  /** Percentage move lines to display (e.g. [-10, -5, 5, 10]) */
  enabledLines: number[];
}

/**
 * Imperative React component that renders price lines directly onto a TradingView
 * Lightweight Chart candlestick series.
 *
 * Displays:
 * 1. Entry price reference line (blue, dashed, lineWidth 2).
 * 2. Scenario target exit price lines (-10% to +10%) colored green for profit
 *    and red for loss, labeled with percentage, exit price, and gross P&L.
 *
 * Renders `null` as all DOM mutations happen via the chart series API.
 */
export function PriceLines({
  chart,
  series,
  entryPrice,
  margin,
  leverage,
  direction,
  enabledLines,
}: PriceLinesProps): null {
  const priceLinesRef = useRef<IPriceLine[]>([]);

  useEffect(() => {
    // 1. Remove any previously created price lines
    if (priceLinesRef.current.length > 0 && series) {
      for (const line of priceLinesRef.current) {
        try {
          series.removePriceLine(line);
        } catch {
          // Ignore if line or series was already destroyed
        }
      }
      priceLinesRef.current = [];
    }

    // Series and valid entry price required to draw lines
    if (!series || !entryPrice || entryPrice <= 0 || !Number.isFinite(entryPrice)) {
      return;
    }

    const createdLines: IPriceLine[] = [];

    // 2. Draw Trade Entry Price Line (blue dashed)
    try {
      const entryLine = series.createPriceLine({
        price: entryPrice,
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Entry',
      });
      createdLines.push(entryLine);
    } catch (err) {
      console.warn('[PriceLines] Error creating entry price line:', err);
    }

    // 3. Draw scenario price lines for each enabled percentage move
    const positionSize = calcPositionSize(margin, leverage);

    for (const pct of enabledLines) {
      if (pct === 0 || !Number.isFinite(pct)) {
        continue; // 0% represents entry price which is already drawn
      }

      const exitPrice = calcExitPrice(entryPrice, pct);
      if (exitPrice <= 0 || !Number.isFinite(exitPrice)) {
        continue;
      }

      // Directional profit logic:
      // LONG: positive move is profit, negative move is loss.
      // SHORT: negative move is profit, positive move is loss.
      const isProfit = (direction === 'LONG' && pct > 0) || (direction === 'SHORT' && pct < 0);
      const color = isProfit ? '#22c55e' : '#ef4444';
      const grossPnl = calcGrossPnL(positionSize, pct, direction);

      const pctStr = pct > 0 ? `+${pct}%` : `${pct}%`;
      const priceStr = formatCurrency(exitPrice, exitPrice % 1 === 0 ? 0 : 2);
      const pnlStr = `P&L: ${grossPnl >= 0 ? '+' : ''}${formatCurrency(grossPnl)}`;
      const title = `${pctStr} | ${priceStr} | ${pnlStr}`;

      try {
        const scenarioLine = series.createPriceLine({
          price: exitPrice,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title,
        });
        createdLines.push(scenarioLine);
      } catch (err) {
        console.warn(`[PriceLines] Error creating scenario price line for ${pct}%:`, err);
      }
    }

    priceLinesRef.current = createdLines;

    // Cleanup on unmount or re-render
    return () => {
      if (series) {
        for (const line of createdLines) {
          try {
            series.removePriceLine(line);
          } catch {
            // Ignore if already removed
          }
        }
      }
      priceLinesRef.current = [];
    };
  }, [chart, series, entryPrice, margin, leverage, direction, enabledLines]);

  return null;
}
