'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, DollarSignIcon } from 'lucide-react';

interface Provider {
  address: string;
  name: string;
  avatar: string;
  pnl_pct: number;
  win_rate: number;
  signal_count: number;
  trades: any[];
}

interface CopyTradingResult {
  provider: Provider;
  totalReturn: number;
  totalTrades: number;
  winRate: number;
  wouldHaveProfit: number;
}

export default function CopyTradingPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [startBalance, setStartBalance] = useState<number>(1000);
  const [positionSize, setPositionSize] = useState<number>(10); // Percentage of balance per trade
  const [copyResults, setCopyResults] = useState<CopyTradingResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      // Filter to only active providers with trades
      const activeProviders = data.providers.filter((p: Provider) => p.signal_count > 0);
      setProviders(activeProviders);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const simulateCopyTrading = async () => {
    if (!selectedProvider) return;
    
    setLoading(true);
    const provider = providers.find(p => p.address === selectedProvider);
    if (!provider) return;

    // Simulate copy trading by replaying their trades
    let currentBalance = startBalance;
    let totalTrades = 0;
    let winningTrades = 0;
    const positionSizeDecimal = positionSize / 100;

    for (const trade of provider.trades.slice(0, 20)) { // Limit to recent 20 trades
      if (trade.status === 'closed' && trade.pnl !== null && trade.pnl !== undefined) {
        totalTrades++;
        const positionValue = currentBalance * positionSizeDecimal;
        const leverage = trade.leverage || 1;
        const pnlPercent = trade.pnl / 100; // Convert to decimal
        
        // Calculate profit/loss
        const pnlAmount = positionValue * pnlPercent * leverage;
        currentBalance += pnlAmount;
        
        if (pnlAmount > 0) {
          winningTrades++;
        }
      }
    }

    const totalReturn = ((currentBalance - startBalance) / startBalance) * 100;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profit = currentBalance - startBalance;

    setCopyResults({
      provider,
      totalReturn,
      totalTrades,
      winRate,
      wouldHaveProfit: profit
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Copy Trading Simulator
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            See how much profit you could have made by copy-trading our top performers. 
            Simulate following successful agents with your own strategy.
          </p>
        </div>

        {/* Simulator Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Configuration Panel */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-6">
                Configure Your Strategy
              </h2>
              
              {/* Provider Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Agent to Copy
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                >
                  <option value="">Choose an agent...</option>
                  {providers.map((provider) => (
                    <option key={provider.address} value={provider.address}>
                      {provider.name} ({provider.signal_count} signals, {provider.pnl_pct.toFixed(1)}% PnL)
                    </option>
                  ))}
                </select>
              </div>

              {/* Starting Balance */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Starting Balance ($)
                </label>
                <input
                  type="number"
                  value={startBalance}
                  onChange={(e) => setStartBalance(Number(e.target.value))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                  min="100"
                  max="100000"
                />
              </div>

              {/* Position Size */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Position Size (% of balance per trade)
                </label>
                <input
                  type="range"
                  value={positionSize}
                  onChange={(e) => setPositionSize(Number(e.target.value))}
                  className="w-full"
                  min="1"
                  max="50"
                />
                <div className="text-center text-slate-400 text-sm mt-1">
                  {positionSize}% per trade
                </div>
              </div>

              {/* Simulate Button */}
              <button
                onClick={simulateCopyTrading}
                disabled={!selectedProvider || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Simulating...' : 'Simulate Copy Trading'}
              </button>
            </div>

            {/* Results Panel */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-6">
                Simulation Results
              </h2>
              
              {copyResults ? (
                <div className="space-y-6">
                  {/* Agent Info */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      {copyResults.provider.avatar && (
                        <img 
                          src={copyResults.provider.avatar} 
                          alt={copyResults.provider.name}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-white">{copyResults.provider.name}</h3>
                        <p className="text-slate-400 text-sm">Following their last 20 trades</p>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <DollarSignIcon className="w-5 h-5 text-green-400" />
                        <span className="text-slate-300 text-sm">Total Return</span>
                      </div>
                      <div className={`text-2xl font-bold ${copyResults.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {copyResults.totalReturn >= 0 ? '+' : ''}{copyResults.totalReturn.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <TrendingUpIcon className="w-5 h-5 text-blue-400" />
                        <span className="text-slate-300 text-sm">Win Rate</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {copyResults.winRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Profit/Loss */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Final Balance</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Started with:</span>
                      <span className="text-white">${startBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Would have:</span>
                      <span className={`font-bold ${copyResults.wouldHaveProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${(startBalance + copyResults.wouldHaveProfit).toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-slate-600 my-2"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Profit/Loss:</span>
                      <div className="flex items-center space-x-2">
                        {copyResults.wouldHaveProfit >= 0 ? (
                          <ArrowUpIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`font-bold ${copyResults.wouldHaveProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {copyResults.wouldHaveProfit >= 0 ? '+' : ''}${copyResults.wouldHaveProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trades Summary */}
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <p className="text-slate-300 text-sm">
                      Simulated {copyResults.totalTrades} trades with {positionSize}% position sizing
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-200 text-sm mb-3">
                      Ready to start copy trading or become a signal provider yourself?
                    </p>
                    <div className="flex space-x-3">
                      <a 
                        href="/register" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg transition-colors"
                      >
                        Become Provider
                      </a>
                      <a 
                        href="/leaderboard" 
                        className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-center py-2 px-4 rounded-lg transition-colors"
                      >
                        View All Agents
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-12">
                  <TrendingUpIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Configure your strategy and click simulate to see results</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Educational Content */}
        <div className="mt-12 max-w-4xl mx-auto bg-slate-800/30 border border-slate-700 rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-4">How Copy Trading Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-300">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Choose Your Agent</h3>
              <p className="text-sm">Select from verified agents with transparent, on-chain performance history.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">2. Set Your Risk</h3>
              <p className="text-sm">Configure position sizing and risk management to match your strategy.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">3. Automate Execution</h3>
              <p className="text-sm">Real-time signals trigger your trades automatically via API or manual execution.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}