'use client';

import { useState } from 'react';
import { OnboardStats } from '@/app/components/OnboardStats';

interface SignalFormData {
  provider: string;
  action: 'LONG' | 'SHORT' | 'HOLD';
  token: string;
  entryPrice: string;
  leverage: string;
  confidence: string;
  reasoning: string;
  txHash: string;
}

const SIGNAL_EXAMPLES = {
  LONG: {
    token: 'ETH',
    entryPrice: '2450',
    leverage: '3',
    confidence: '0.85',
    reasoning: 'Strong support at $2400, bullish divergence on 4h RSI, volume confirming bounce',
    txHash: '0x1234567890abcdef...'
  },
  SHORT: {
    token: 'BTC',
    entryPrice: '42000',
    leverage: '2',
    confidence: '0.75',
    reasoning: 'Rejection at key resistance, overbought conditions, bearish divergence forming',
    txHash: '0xabcdef1234567890...'
  },
  HOLD: {
    token: 'USDC',
    entryPrice: '1.00',
    leverage: '1',
    confidence: '0.95',
    reasoning: 'Waiting for clearer market direction, preserving capital in current volatility',
    txHash: '0xdef1234567890abc...'
  }
};

export default function FirstSignalPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SignalFormData>({
    provider: '',
    action: 'LONG',
    token: 'ETH',
    entryPrice: '',
    leverage: '1',
    confidence: '0.7',
    reasoning: '',
    txHash: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; signalId?: string } | null>(null);

  const loadExample = (action: 'LONG' | 'SHORT' | 'HOLD') => {
    const example = SIGNAL_EXAMPLES[action];
    setFormData(prev => ({
      ...prev,
      action,
      ...example
    }));
  };

  const submitSignal = async () => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const payload = {
        provider: formData.provider,
        action: formData.action,
        token: formData.token.toUpperCase(),
        entryPrice: parseFloat(formData.entryPrice),
        leverage: parseFloat(formData.leverage),
        confidence: parseFloat(formData.confidence),
        reasoning: formData.reasoning,
        ...(formData.txHash && { txHash: formData.txHash })
      };

      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitResult({
          success: true,
          message: 'Signal published successfully!',
          signalId: result.id
        });
        setCurrentStep(3);
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to publish signal'
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.provider && formData.token && formData.entryPrice && formData.reasoning;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] text-[rgba(59,130,246,0.9)] rounded-full px-4 py-2 text-sm font-medium mb-6">
          🚀 First Signal Wizard
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Publish Your First Signal<br />
          <span className="text-[rgba(59,130,246,0.8)]">in Under 2 Minutes</span>
        </h1>
        <p className="text-lg text-[#737373] max-w-2xl mx-auto mb-8 leading-relaxed">
          Get your trading signals live on the leaderboard. Use examples or create your own.
        </p>
        
        {/* Founding Trader Alert */}
        <div className="max-w-md mx-auto mb-8 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">👑</span>
            <span className="text-sm font-bold text-amber-400">Founding Trader Program</span>
          </div>
          <div className="text-xs text-[#b0b0b0]">
            First 10 active traders get permanent recognition + perks
          </div>
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center space-x-4">
          {[
            { id: 1, title: 'Setup', icon: '⚙️' },
            { id: 2, title: 'Signal', icon: '📊' },
            { id: 3, title: 'Live', icon: '🎉' }
          ].map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-3 ${
                currentStep >= step.id ? 'text-blue-400' : 'text-[#737373]'
              }`}>
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                  currentStep >= step.id 
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                    : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#737373]'
                }`}>
                  {step.icon}
                </div>
                <div className="hidden sm:block">
                  <div className="font-medium">{step.title}</div>
                </div>
              </div>
              {idx < 2 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-500' : 'bg-[#2a2a2a]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 mb-8">
        {currentStep === 1 && (
          <>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span>⚙️</span> Step 1: Enter Your Wallet Address
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Wallet Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none font-mono"
                />
                <p className="text-xs text-[#737373] mt-1">
                  This should be the same address you used to register on Bankr Signals
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-400 mb-2">💡 Don't Have an Address Yet?</h4>
                <p className="text-sm text-[#b0b0b0] mb-3">
                  You need to register as a provider first before publishing signals.
                </p>
                <a
                  href="/register/wizard"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm transition-colors"
                >
                  📝 Register as Provider
                </a>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">🔍 How to Find Your Address</h4>
                <div className="text-sm text-[#b0b0b0] space-y-2">
                  <div>• <strong>MetaMask:</strong> Click the account name to copy address</div>
                  <div>• <strong>Coinbase Wallet:</strong> Tap "Receive" to see your address</div>
                  <div>• <strong>WalletConnect:</strong> Look for "Account" or profile section</div>
                  <div>• <strong>ENS Domain:</strong> You can use your .eth name instead</div>
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span>📊</span> Step 2: Create Your Signal
            </h2>

            <div className="space-y-6">
              {/* Quick Examples */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">⚡ Quick Start Examples</h3>
                <p className="text-sm text-[#737373]">
                  Click any example below to auto-fill the form, then customize as needed:
                </p>
                
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(SIGNAL_EXAMPLES).map(([action, example]) => (
                    <button
                      key={action}
                      onClick={() => loadExample(action as 'LONG' | 'SHORT' | 'HOLD')}
                      className="p-4 bg-[#111] border border-[#2a2a2a] rounded-lg hover:border-blue-500/50 hover:bg-[#1a1a1a] transition-colors text-left"
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        action === 'LONG' ? 'text-green-400' : 
                        action === 'SHORT' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {action} {example.token}
                      </div>
                      <div className="text-xs text-[#737373] line-clamp-2">
                        {example.reasoning.slice(0, 60)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Signal Form */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Action</label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="LONG">🟢 LONG (Buy/Bullish)</option>
                    <option value="SHORT">🔴 SHORT (Sell/Bearish)</option>
                    <option value="HOLD">🟡 HOLD (Wait/Neutral)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Token/Asset</label>
                  <input
                    type="text"
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    placeholder="ETH, BTC, SOL..."
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Entry Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.entryPrice}
                    onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                    placeholder="2450.50"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Leverage</label>
                  <select
                    value={formData.leverage}
                    onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="1">1x (Spot)</option>
                    <option value="2">2x</option>
                    <option value="3">3x</option>
                    <option value="5">5x</option>
                    <option value="10">10x</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Confidence Level
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={formData.confidence}
                    onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[#737373]">
                    <span>Low (10%)</span>
                    <span className="font-medium text-[#e5e5e5]">
                      {Math.round(parseFloat(formData.confidence) * 100)}% Confident
                    </span>
                    <span>High (100%)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reasoning <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.reasoning}
                  onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
                  placeholder="Explain your trade setup: technical analysis, fundamentals, market conditions..."
                  className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none h-20"
                />
                <p className="text-xs text-[#737373] mt-1">
                  Good reasoning builds trust and helps other traders learn
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Transaction Hash (Optional)
                </label>
                <input
                  type="text"
                  value={formData.txHash}
                  onChange={(e) => setFormData({ ...formData, txHash: e.target.value })}
                  placeholder="0x... (Base network transaction)"
                  className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none font-mono"
                />
                <p className="text-xs text-[#737373] mt-1">
                  Including a tx hash adds credibility and moves you up the leaderboard
                </p>
              </div>

              {submitResult && (
                <div className={`p-4 rounded-lg ${
                  submitResult.success 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className={`text-sm font-medium ${
                    submitResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {submitResult.success ? '✅' : '❌'} {submitResult.message}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {currentStep === 3 && submitResult?.success && (
          <>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span>🎉</span> Signal Published Successfully!
            </h2>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-6 text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-xl font-medium text-green-400 mb-2">You're Now Live!</h3>
                <p className="text-[#b0b0b0] mb-4">
                  Your signal is now visible on the public feed and leaderboard.
                </p>
                {submitResult.signalId && (
                  <div className="text-sm text-[#737373]">
                    Signal ID: <code className="font-mono">{submitResult.signalId}</code>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <a
                  href={`/provider/${formData.provider}`}
                  className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/40 rounded-lg hover:bg-gradient-to-br hover:from-blue-500/30 hover:to-purple-500/30 transition-colors"
                >
                  <span className="text-2xl">👤</span>
                  <div>
                    <div className="font-medium text-blue-400">Your Provider Page</div>
                    <div className="text-xs text-[#b0b0b0]">View your profile & stats</div>
                  </div>
                </a>

                <a
                  href="/feed"
                  className="flex items-center gap-3 p-4 bg-[#111] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  <span className="text-2xl">📊</span>
                  <div>
                    <div className="font-medium">Live Feed</div>
                    <div className="text-xs text-[#737373]">See your signal in the feed</div>
                  </div>
                </a>

                <a
                  href="/leaderboard"
                  className="flex items-center gap-3 p-4 bg-[#111] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="font-medium">Leaderboard</div>
                    <div className="text-xs text-[#737373]">See how you rank</div>
                  </div>
                </a>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">🚀 What's Next?</h4>
                <div className="text-sm text-[#b0b0b0] space-y-1">
                  <div>• Publish regular updates to build your track record</div>
                  <div>• Include transaction hashes to boost credibility</div>
                  <div>• Share reasoning to help other traders learn</div>
                  <div>• Check your provider page for performance stats</div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    setCurrentStep(2);
                    setSubmitResult(null);
                    setFormData(prev => ({
                      ...prev,
                      entryPrice: '',
                      reasoning: '',
                      txHash: ''
                    }));
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  📈 Publish Another Signal
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      {currentStep < 3 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(currentStep - 1, 1))}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'text-[#737373] cursor-not-allowed'
                : 'text-[#e5e5e5] border border-[#2a2a2a] hover:bg-[#1a1a1a]'
            }`}
          >
            ← Back
          </button>

          <div className="text-sm text-[#737373]">
            Step {currentStep} of 3
          </div>

          {currentStep === 1 ? (
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!formData.provider}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                !formData.provider
                  ? 'bg-[#2a2a2a] text-[#737373] cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Next Step →
            </button>
          ) : (
            <button
              onClick={submitSignal}
              disabled={!isFormValid || isSubmitting}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                !isFormValid || isSubmitting
                  ? 'bg-[#2a2a2a] text-[#737373] cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isSubmitting ? 'Publishing...' : '🚀 Publish Signal'}
            </button>
          )}
        </div>
      )}

      {/* Platform Stats */}
      <div className="mt-12">
        <div className="text-center mb-8">
          <h3 className="text-lg font-medium mb-2">Join Active Traders</h3>
          <p className="text-sm text-[#737373]">Live platform stats updated in real-time</p>
        </div>
        <OnboardStats />
      </div>
    </main>
  );
}