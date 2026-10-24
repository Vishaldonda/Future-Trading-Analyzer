import React from 'react';
import { TradingProvider, useTradingContext } from './context/TradingContext';
import { Header } from './components/Header/Header';
import { ChartContainer } from './components/Chart/ChartContainer';
import { TradingControls } from './components/Controls/TradingControls';
import { FeeSettings } from './components/Controls/FeeSettings';
import { ResultsPanel } from './components/Results/ResultsPanel';
import { LeverageTables } from './components/Tables/LeverageTables';
import { ScenarioPlayground } from './components/Playground/ScenarioPlayground';
import { AdditionalCharts } from './components/Chart/AdditionalCharts';
import { DISCLAIMER_TEXT } from './utils/constants';
import type { TradingState } from './context/types';

interface TabItem {
  id: TradingState['activeTab'];
  label: string;
}

const TABS: TabItem[] = [
  { id: 'chart', label: 'Chart' },
  { id: 'tables', label: 'Tables' },
  { id: 'playground', label: 'Playground' },
  { id: 'views', label: 'Analysis' },
];

/**
 * Inner application layout container consuming TradingContext.
 */
function MainLayout(): React.JSX.Element {
  const { state, dispatch } = useTradingContext();
  const { activeTab } = state;

  const handleTabChange = (tabId: TradingState['activeTab']) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header />

      {/* Tab Navigation */}
      <nav
        aria-label="Application tabs"
        className="flex items-center gap-1 bg-slate-800 mx-4 mt-4 rounded-lg p-1 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content Area - Varies by Active Tab */}
      <div className="flex-1">
        {activeTab === 'chart' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 p-4">
            {/* Left Column: Controls & Fees */}
            <aside className="space-y-4">
              <TradingControls />
              <FeeSettings />
            </aside>

            {/* Center Column: Candlestick Chart */}
            <main className="min-w-0">
              <ChartContainer />
            </main>

            {/* Right Column: Results & Liquidation */}
            <aside className="space-y-4">
              <ResultsPanel />
            </aside>
          </div>
        )}

        {activeTab === 'tables' && <LeverageTables />}
        {activeTab === 'playground' && <ScenarioPlayground />}
        {activeTab === 'views' && <AdditionalCharts candles={state.candles} />}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/90 px-4 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>{DISCLAIMER_TEXT}</p>
          <p className="shrink-0 text-slate-400">
            Data Source:{' '}
            <span className="text-slate-300 font-medium">Binance Futures API (fapi.binance.com)</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Root Application component wrapped with TradingProvider state provider.
 */
export function App(): React.JSX.Element {
  return (
    <TradingProvider>
      <MainLayout />
    </TradingProvider>
  );
}

export default App;
