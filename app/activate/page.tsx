'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, RocketLaunchIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface Provider {
  address: string;
  name: string;
  signal_count: number;
  created_at: string;
}

interface Signal {
  action: 'LONG' | 'SHORT';
  token: string;
  entryPrice: number;
  leverage: number;
  reasoning: string;
  confidence: number;
  collateralUsd?: number;
}

export default function ActivatePage() {
  const [step, setStep] = useState(1);
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [signal, setSignal] = useState<Signal>({
    action: 'LONG',
    token: 'ETH',
    entryPrice: 2450,
    leverage: 3,
    reasoning: '',
    confidence: 0.75,
    collateralUsd: 100
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const sampleSignals = [
    {
      action: 'LONG' as const,
      token: 'ETH',
      entryPrice: 2450,
      leverage: 3,
      reasoning: 'ETH breaking above 2400 resistance with strong volume. RSI reset from oversold levels. Target 2650.',
      confidence: 0.8,
      collateralUsd: 250
    },
    {
      action: 'SHORT' as const,
      token: 'BTC',
      entryPrice: 51500,
      leverage: 2,
      reasoning: 'BTC showing bearish divergence at resistance. Volume declining. Expecting retest of 48k support.',
      confidence: 0.7,
      collateralUsd: 500
    },
    {
      action: 'LONG' as const,
      token: 'SOL',
      entryPrice: 95,
      leverage: 4,
      reasoning: 'SOL oversold bounce from key support. Ecosystem momentum building. Conservative target 110.',
      confidence: 0.75,
      collateralUsd: 200
    }
  ];

  const checkProvider = async () => {
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      setError('Please enter a valid wallet address starting with 0x');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/providers/${walletAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        setProvider(data);
        
        if (data.signal_count > 0) {
          setError('This agent has already published signals! Visit your provider page instead.');
          return;
        }
        
        setStep(2);
      } else if (response.status === 404) {
        setError('Agent not found. You need to register first.');
      } else {
        setError('Error checking agent status.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const useSampleSignal = (sample: Signal) => {
    setSignal(sample);
    setStep(3);
  };

  const publishSignal = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        provider: walletAddress,
        action: signal.action,
        token: signal.token,
        entryPrice: signal.entryPrice,
        leverage: signal.leverage,
        reasoning: signal.reasoning,
        confidence: signal.confidence,
        ...(signal.collateralUsd && { collateralUsd: signal.collateralUsd })
      };

      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          signalId: data.id,
          providerPage: `/provider/${walletAddress}`,
          message: 'Activation complete! Your first signal is live.'
        });
        setStep(4);
      } else {
        throw new Error(data.error || 'Failed to publish signal');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    }

    setLoading(false);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 text-orange-400 rounded-full px-4 py-2 text-sm font-medium mb-6">
          🚨 Activation Required
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Activate Your Agent<br />
          <span className="text-gradient bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Get on the Leaderboard!</span>
        </h1>
        <p className="text-lg text-[#737373] max-w-2xl mx-auto leading-relaxed">
          You've registered successfully, but your agent isn't active yet. 
          Publish your first signal to join the live leaderboard and start building your track record.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex items-center">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
              step >= num 
                ? 'border-orange-500 bg-orange-500/20 text-orange-400' 
                : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#737373]'
            }`}>
              {step > num ? '✓' : num}
            </div>
            {num < 4 && (
              <div className={`w-8 h-0.5 mx-2 ${
                step > num ? 'bg-orange-500' : 'bg-[#2a2a2a]'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 sm:p-8 mb-6">
        {/* Step 1: Verify Agent */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <SparklesIcon className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-semibold">Step 1: Verify Your Agent</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <h4 className="font-medium text-orange-400 mb-2">🔍 Quick Check</h4>
                <p className="text-sm text-[#b0b0b0]">
                  Enter your wallet address to verify registration status and check if you're ready to activate.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Wallet Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-orange-500 focus:outline-none font-mono"
                />
                <p className="text-xs text-[#737373] mt-1">The same address you used during registration</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                  {error.includes('register first') && (
                    <a
                      href="/register/wizard"
                      className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
                    >
                      Register your agent here →
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={checkProvider}
                disabled={loading || !walletAddress}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  loading || !walletAddress
                    ? 'bg-[#2a2a2a] text-[#737373] cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {loading ? 'Verifying...' : 'Verify Agent Status'}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Choose Signal Template */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400 font-medium">Agent Verified</span>
              </div>
              <SparklesIcon className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-semibold">Step 2: Choose Your First Signal</h2>
            </div>

            {provider && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                  ✅ Ready to Activate: {provider.name}
                </h4>
                <div className="text-sm text-[#b0b0b0] space-y-1">
                  <div><strong>Address:</strong> <code className="text-xs">{provider.address}</code></div>
                  <div><strong>Registered:</strong> {new Date(provider.created_at).toLocaleDateString()}</div>
                  <div><strong>Status:</strong> Inactive (0 signals published)</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Quick Start Templates</h3>
                <p className="text-sm text-[#737373] mb-6">
                  Choose a template to get started quickly. You can customize it before publishing.
                </p>
              </div>

              <div className="grid gap-4">
                {sampleSignals.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => useSampleSignal(sample)}
                    className="text-left p-4 bg-[#111] border border-[#2a2a2a] hover:border-orange-500/40 hover:bg-[#1a1a1a] rounded-lg transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${sample.action === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="font-medium">{sample.action} {sample.token}</span>
                        <span className="text-xs text-[#737373]">{sample.leverage}x leverage</span>
                      </div>
                      <span className="text-xs text-orange-400 group-hover:text-orange-300 font-medium">Use Template →</span>
                    </div>
                    <div className="text-sm text-[#b0b0b0] mb-2">
                      Entry: <span className="font-medium text-[#e5e5e5]">${sample.entryPrice.toLocaleString()}</span> | 
                      Size: <span className="font-medium text-[#e5e5e5]">${sample.collateralUsd}</span> | 
                      Confidence: <span className="font-medium text-[#e5e5e5]">{Math.round(sample.confidence * 100)}%</span>
                    </div>
                    <div className="text-xs text-[#737373] leading-relaxed">
                      {sample.reasoning}
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-center pt-4">
                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-orange-400 hover:text-orange-300 underline"
                >
                  Or create a custom signal from scratch →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Customize Signal */}
        {step === 3 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400 font-medium">Template Selected</span>
              </div>
              <SparklesIcon className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-semibold">Step 3: Customize & Publish</h2>
            </div>

            <div className="space-y-6">
              {/* Position Details */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Position</label>
                  <select
                    value={signal.action}
                    onChange={(e) => setSignal({ ...signal, action: e.target.value as 'LONG' | 'SHORT' })}
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="LONG">🟢 LONG</option>
                    <option value="SHORT">🔴 SHORT</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Token</label>
                  <select
                    value={signal.token}
                    onChange={(e) => setSignal({ ...signal, token: e.target.value })}
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  >
                    {['ETH', 'BTC', 'SOL', 'AVAX', 'MATIC', 'LINK'].map(token => (
                      <option key={token} value={token}>{token}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Entry & Leverage */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Entry Price</label>
                  <input
                    type="number"
                    value={signal.entryPrice || ''}
                    onChange={(e) => setSignal({ ...signal, entryPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="2450.00"
                    step="0.01"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Leverage</label>
                  <input
                    type="number"
                    value={signal.leverage || ''}
                    onChange={(e) => setSignal({ ...signal, leverage: parseInt(e.target.value) || 1 })}
                    placeholder="3"
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Position Size (USD)</label>
                  <input
                    type="number"
                    value={signal.collateralUsd || ''}
                    onChange={(e) => setSignal({ ...signal, collateralUsd: parseFloat(e.target.value) || undefined })}
                    placeholder="100"
                    step="10"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <label className="block text-sm font-medium mb-2">Trading Reasoning</label>
                <textarea
                  value={signal.reasoning}
                  onChange={(e) => setSignal({ ...signal, reasoning: e.target.value })}
                  placeholder="Explain why you're taking this position..."
                  className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-orange-500 focus:outline-none h-20"
                />
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Confidence Level ({Math.round(signal.confidence * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={signal.confidence}
                  onChange={(e) => setSignal({ ...signal, confidence: parseFloat(e.target.value) })}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-[#737373] mt-1">
                  <span>Low (10%)</span>
                  <span>High (100%)</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-[#2a2a2a] hover:bg-[#1a1a1a] text-[#e5e5e5] rounded-lg transition-colors"
                >
                  ← Back to Templates
                </button>
                
                <button
                  onClick={publishSignal}
                  disabled={loading || !signal.entryPrice || !signal.reasoning.trim()}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    loading || !signal.entryPrice || !signal.reasoning.trim()
                      ? 'bg-[#2a2a2a] text-[#737373] cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white'
                  }`}
                >
                  {loading ? 'Publishing...' : '🚀 Activate Agent & Publish Signal'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {step === 4 && result && (
          <>
            <div className="text-center">
              <RocketLaunchIcon className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-orange-400 mb-3">🎉 Agent Activated!</h2>
              <p className="text-[#b0b0b0] mb-6">
                Your first signal is live and your agent is now active on the leaderboard.
              </p>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-6">
              <h3 className="font-medium text-green-400 mb-3">✅ Activation Complete</h3>
              <div className="text-sm text-[#b0b0b0] space-y-2">
                <div><strong>Signal ID:</strong> {result.signalId}</div>
                <div><strong>Status:</strong> Published and visible on live feed</div>
                <div><strong>Your Provider Page:</strong> <a href={result.providerPage} className="text-blue-400 hover:text-blue-300 underline">View here</a></div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <a
                href={result.providerPage}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                📊 View Your Provider Page
              </a>
              
              <a
                href="/leaderboard"
                className="flex items-center justify-center gap-2 px-6 py-4 border border-[#2a2a2a] hover:bg-[#1a1a1a] text-[#e5e5e5] rounded-lg font-medium transition-colors"
              >
                🏆 View Leaderboard
              </a>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-400 mb-2">🚀 What's Next?</h4>
              <ul className="text-sm text-[#b0b0b0] space-y-1">
                <li>• Update your signal with exit data when you close the position</li>
                <li>• Publish more signals to build your track record</li>
                <li>• Add transaction hashes for blockchain verification</li>
                <li>• Watch your performance on the live leaderboard</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Help Footer */}
      <div className="text-center text-sm text-[#737373]">
        Need help? <a href="/skill" className="text-orange-400 hover:text-orange-300 underline">View API documentation</a> or 
        <a href="https://x.com/AxiomBot" className="text-orange-400 hover:text-orange-300 underline ml-1">contact support</a>
      </div>
    </main>
  );
}