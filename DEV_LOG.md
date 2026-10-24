# Development Log — Future Trading Analyzer

This document tracks implementation status, architectural decisions, solved issues, environment configurations, and the next-steps roadmap for seamless continuity across developer and AI coding sessions (such as Claude Code).

---

## Current Status (2026-10-24)

- **Repository**: `https://github.com/Vishaldonda/Future-Trading-Analyzer.git`
- **Branch**: `main`
- **Test Suite**: **159 / 159 tests passing** (`vitest run`, 29 test files)
- **TypeScript**: Strict mode with zero compiler errors (`tsc -b`)
- **Build**: Production build succeeded (bundle size: ~500 KB, 152 KB gzipped)
- **Features Implemented**: Complete calculation engine, Binance REST + WebSocket streaming, TradingView Lightweight Chart with dynamic scenario lines, 1x–10x leverage tables (210 scenarios) with CSV export, standalone playground, additional analysis charts, responsive dark UI.

---

## Resuming Work (Quick Reference for Claude Code / Developers)

To resume development in a new session:
```bash
# 1. Ensure Node.js v22+ is in PATH
export PATH="$HOME/.local/lib/nodejs/node-v22.16.0-darwin-arm64/bin:$PATH"

# 2. Enter project directory
cd "/Users/vishal/Desktop/Future Trading Analyzer"

# 3. Verify tests and build
npm test
npm run build

# 4. Start development server
npm run dev
```

---

## Completed Milestones

### Phase 1: Project Scaffold & Tooling
- Initialized React 19 + TypeScript + Vite project.
- Configured Tailwind CSS v4 via `@tailwindcss/vite`.
- Configured Vite reverse proxy (`/binance-api` -> `https://fapi.binance.com`) to bypass browser CORS during development.
- Configured Vitest with `@testing-library/react` and `jsdom`.

### Phase 2: Pure Calculation Engine (`src/calculations/`)
All financial logic is separated into unit-tested pure functions without side effects:
- `pnl.ts`:
  - `calcPositionSize(margin, leverage)`
  - `calcPriceChange(entry, exit)`
  - `calcExitPrice(entry, percentageMove)`
  - `calcGrossPnL(positionSize, priceChangePct, direction)`
  - `calcReturnOnMargin(pnl, margin)`
  - `calcNetPnL(grossPnl, fees, funding)`
  - `calcRemainingEquity(margin, netPnl)`
  - `calcQuantity(positionSize, entryPrice)`
- `liquidation.ts`:
  - Binance USDS-M tiered bracket lookup (`findBracket`).
  - Isolated Long & Short liquidation price calculations using maintenance margin rate (MMR) and cumulative deduction offsets.
  - Returns structured estimate objects with risk warnings.
- `fees.ts`:
  - Maker / Taker transaction fees and funding payments.
  - Supports custom fee overrides.
- `scenarios.ts`:
  - `generateScenarioRow`: Computes full metrics for any given percentage move.
  - `generateScenarioTable`: Computes 21 discrete rows (−10% to +10% in 1% steps).
  - `generateAllLeverageTables`: Computes 10 tables for 1× to 10× leverage (210 total rows).

### Phase 3: Data Layer & Custom Hooks (`src/api/` & `src/hooks/`)
- `binanceRest.ts`: Public endpoints for historical klines, exchange contract information, tiered leverage brackets, and mark prices.
- `binanceWebSocket.ts`: Robust WebSocket manager connecting to `wss://fstream.binance.com` for real-time kline and mark price streaming with 3-minute keep-alive pings and exponential backoff reconnection.
- Custom Hooks:
  - `useBinanceKlines`: Fetches historical candles with backward pagination (`fetchMore('older')`).
  - `useBinanceWebSocket`: Real-time candle updates and live mark price feed.
  - `useExchangeInfo`: Fetches available perpetual contracts.
  - `useScenarios`: Memoized scenario matrix generation.

### Phase 4: State Management & Utilities (`src/context/` & `src/utils/`)
- `TradingContext.tsx`: App-wide state reducer handling market inputs, candle datasets, live tickers, UI active tabs, and enabled price line toggles.
- `formatting.ts`: Safe number formatting for currency, percentages with explicit signs (`+`/`-`), BTC prices, compact suffixes (K/M/B), and timestamps.
- `timezone.ts`: Timezone converter covering 12 major financial regions.
- `constants.ts`: System defaults (BTCUSDT, 10 USDT margin, 10x leverage, $80k entry) and interval definitions.

### Phase 5: User Interface (`src/components/`)
- **Chart**:
  - `CandlestickChart.tsx`: TradingView Lightweight Charts v5 with candlestick series and bottom volume histogram overlay.
  - `PriceLines.tsx`: Imperative price line manager drawing Entry line + 20 scenario lines with dynamic profit/loss coloring.
  - `ChartControls.tsx`: Interval, timezone, and live connection status indicators.
  - `AdditionalCharts.tsx`: Alternative views (line, volume, price change %, P&L sensitivity, long vs. short comparison).
- **Controls & Results**:
  - `TradingControls.tsx`: Interactive sliders, quick-leverage buttons, margin mode toggles, and live price picker.
  - `ResultsPanel.tsx`: Grid of metrics cards and `LiquidationWarning.tsx` showing distance-to-liquidation progress bar.
- **Tables & Playground**:
  - `LeverageTables.tsx`: Accordion view of 10 leverage tables with Papa Parse CSV export.
  - `ScenarioPlayground.tsx`: Standalone sandbox allowing independent experimentation.

---

## Architectural Decisions & Rationale

1. **Lightweight Charts over Chart.js / Canvas**:
   - TradingView's `lightweight-charts` is natively optimized for financial time-series, supporting pan, pinch-to-zoom, crosshair tracking, and coordinate-to-price mapping out of the box with small bundle footprint.
2. **Pure Functional Calculation Engine**:
   - Keeping all math formulas isolated in `src/calculations/` with 100% test coverage guarantees that calculation changes never break UI components and makes auditing formulas simple.
3. **No Private Keys / Read-Only Market Data**:
   - The analyzer strictly consumes public market data endpoints. This eliminates security liability and lowers the barrier to entry for users.
4. **Dev Proxy for CORS**:
   - Browser requests directly to `https://fapi.binance.com` run into CORS restrictions. Vite's development server proxy routes `/binance-api` requests seamlessly during development.
5. **Combined WebSocket Streams**:
   - Subscribing to `@kline_<interval>` and `@markPrice@1s` in a single combined stream URL minimizes socket overhead and eliminates connection negotiation latency.

---

## Known Errors Encountered & Fixes Applied

1. **System Node.js Missing / Older Engine Incompatibility**:
   - *Issue*: Initial system lacked global Node or had Node 20.18 which failed Vite 8 / Oxlint engine requirements (`^20.19.0 || >=22.12.0`).
   - *Fix*: Installed standalone Node.js `v22.16.0` to `$HOME/.local/lib/nodejs/node-v22.16.0-darwin-arm64/bin` and added it to shell session PATH.
2. **`AdditionalCharts.tsx` Undefined Candles Prop**:
   - *Issue*: TypeScript compiler error TS2322 where `candles?: CandleData[]` could pass `undefined` into sub-views expecting `CandleData[]`.
   - *Fix*: Defaulted to `effectiveCandles = candles ?? context.state.candles ?? []`.
3. **Vitest Mock Casts in `PriceLines.test.tsx`**:
   - *Issue*: TypeScript TS2352 casting `IPriceLine` to an object with `id` or `options` property.
   - *Fix*: Stored intermediate mock records cleanly in a local array before casting to `IPriceLine`.
4. **Git Interactive Authentication on Push**:
   - *Issue*: Background `git push` hung waiting for interactive password/token in terminal.
   - *Fix*: Completed local root commit (`fa442eb`) containing all 91 files and documented personal access token / SSH key steps for pushing to GitHub.

---

## Key Commands & Environment

```bash
# Environment PATH setup
export PATH="$HOME/.local/lib/nodejs/node-v22.16.0-darwin-arm64/bin:$PATH"

# Run all unit tests
npm test

# Run linter
npm run lint

# Check TypeScript types
npx tsc -b

# Start development server
npm run dev

# Production build
npm run build
```

---

## Next Steps & Roadmap

### Priority 1: User Experience & Production Readiness
- [ ] Add Vercel / Netlify / Cloudflare deployment configuration with serverless rewrite rule for `/binance-api`.
- [ ] Implement local storage persistence for user preferences (selected symbol, default margin, fee overrides, timezone).
- [ ] Add order-book depth snapshot visualizer (bid/ask distribution).

### Priority 2: Extended Market Features
- [ ] Support multi-asset search with autocomplete for all Binance USDT perpetual pairs.
- [ ] Add interactive draggable entry price line directly on the TradingView chart canvas.
- [ ] Historical liquidation heat-map estimation overlay.

### Priority 3: CI/CD
- [ ] Add GitHub Actions workflow (`.github/workflows/ci.yml`) to run tests and build checks on pull requests.
