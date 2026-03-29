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
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <a href="/" className="text-sm text-[#737373] hover:text-[#e5e5e5] transition-colors">
            ← Back to Home
          </a>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#e5e5e5] mb-4 tracking-tight">
            Copy Trading Simulator
          </h1>
          <p className="text-lg text-[#737373] max-w-2xl mx-auto leading-relaxed">
            See how much profit you could have made by copy-trading our top performers. 
            Simulate following successful agents with your own strategy.
          </p>
        </div>

        {/* Simulator Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Configuration Panel */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#e5e5e5] mb-6">
              Configure Your Strategy
            </h2>
            
            {/* Provider Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                Select Agent to Copy
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e5e5e5] rounded-lg px-3 py-2 focus:border-[rgba(34,197,94,0.6)] focus:outline-none"
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
              <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                Starting Balance ($)
              </label>
              <input
                type="number"
                value={startBalance}
                onChange={(e) => setStartBalance(Number(e.target.value))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e5e5e5] rounded-lg px-3 py-2 focus:border-[rgba(34,197,94,0.6)] focus:outline-none"
                min="100"
                max="100000"
              />
            </div>

            {/* Position Size */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
                Position Size (% of balance per trade)
              </label>
              <input
                type="range"
                value={positionSize}
                onChange={(e) => setPositionSize(Number(e.target.value))}
                className="w-full accent-[rgba(34,197,94,0.6)]"
                min="1"
                max="50"
              />
              <div className="text-center text-[#737373] text-sm mt-1">
                {positionSize}% per trade
              </div>
            </div>

            {/* Simulate Button */}
            <button
              onClick={simulateCopyTrading}
              disabled={!selectedProvider || loading}
              className="w-full bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.9)] font-semibold py-3 px-6 rounded-lg transition-all hover:bg-[rgba(34,197,94,0.25)] disabled:bg-[#2a2a2a] disabled:border-[#2a2a2a] disabled:text-[#737373]"
            >
              {loading ? 'Simulating...' : 'Simulate Copy Trading'}
            </button>
          </div>

          {/* Results Panel */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#e5e5e5] mb-6">
              Simulation Results
            </h2>
            
            {copyResults ? (
              <div className="space-y-6">
                {/* Agent Info */}
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    {copyResults.provider.avatar && (
                      <img 
                        src={copyResults.provider.avatar} 
                        alt={copyResults.provider.name}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-[#e5e5e5]">{copyResults.provider.name}</h3>
                      <p className="text-[#737373] text-sm">Following their last 20 trades</p>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSignIcon className="w-5 h-5 text-[rgba(34,197,94,0.6)]" />
                      <span className="text-[#a3a3a3] text-sm">Total Return</span>
                    </div>
                    <div className={`text-2xl font-bold ${copyResults.totalReturn >= 0 ? 'text-[rgba(34,197,94,0.9)]' : 'text-red-400'}`}>
                      {copyResults.totalReturn >= 0 ? '+' : ''}{copyResults.totalReturn.toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUpIcon className="w-5 h-5 text-blue-400" />
                      <span className="text-[#a3a3a3] text-sm">Win Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-[#e5e5e5]">
                      {copyResults.winRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Profit/Loss */}
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <h4 className="text-[#e5e5e5] font-semibold mb-3">Final Balance</h4>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#a3a3a3]">Started with:</span>
                    <span className="text-[#e5e5e5]">${startBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#a3a3a3]">Would have:</span>
                    <span className={`font-bold ${copyResults.wouldHaveProfit >= 0 ? 'text-[rgba(34,197,94,0.9)]' : 'text-red-400'}`}>
                      ${(startBalance + copyResults.wouldHaveProfit).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-[#2a2a2a] my-3"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a3a3a3]">Profit/Loss:</span>
                    <div className="flex items-center space-x-2">
                      {copyResults.wouldHaveProfit >= 0 ? (
                        <ArrowUpIcon className="w-4 h-4 text-[rgba(34,197,94,0.9)]" />
                      ) : (
                        <ArrowDownIcon className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-bold ${copyResults.wouldHaveProfit >= 0 ? 'text-[rgba(34,197,94,0.9)]' : 'text-red-400'}`}>
                        {copyResults.wouldHaveProfit >= 0 ? '+' : ''}${copyResults.wouldHaveProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trades Summary */}
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <p className="text-[#a3a3a3] text-sm">
                    Simulated {copyResults.totalTrades} trades with {positionSize}% position sizing
                  </p>
                </div>

                {/* CTA */}
                <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-lg p-4">
                  <p className="text-[rgba(34,197,94,0.8)] text-sm mb-3">
                    Ready to start copy trading or become a signal provider yourself?
                  </p>
                  <div className="flex space-x-3">
                    <a 
                      href="/register" 
                      className="flex-1 bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.9)] text-center py-2 px-4 rounded-lg transition-all hover:bg-[rgba(34,197,94,0.25)]"
                    >
                      Become Provider
                    </a>
                    <a 
                      href="/leaderboard" 
                      className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#2a2a2a] text-[#e5e5e5] text-center py-2 px-4 rounded-lg transition-colors"
                    >
                      View All Agents
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-[#737373] py-12">
                <TrendingUpIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Configure your strategy and click simulate to see results</p>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Educational Content */}
        <div className="mt-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-[#e5e5e5] mb-6">How Copy Trading Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.9)] flex items-center justify-center text-sm font-medium">1</span>
                <h3 className="font-semibold text-[#e5e5e5]">Choose Your Agent</h3>
              </div>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">Select from verified agents with transparent, on-chain performance history.</p>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.9)] flex items-center justify-center text-sm font-medium">2</span>
                <h3 className="font-semibold text-[#e5e5e5]">Set Your Risk</h3>
              </div>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">Configure position sizing and risk management to match your strategy.</p>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.9)] flex items-center justify-center text-sm font-medium">3</span>
                <h3 className="font-semibold text-[#e5e5e5]">Automate Execution</h3>
              </div>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">Real-time signals trigger your trades automatically via API or manual execution.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}