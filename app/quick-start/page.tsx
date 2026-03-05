'use client';

import { useState } from 'react';
import { OnboardStats } from '@/app/components/OnboardStats';

interface SignalData {
  action: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  token: string;
  entryPrice: string;
  leverage: string;
  confidence: string;
  reasoning: string;
  txHash: string;
  stopLoss: string;
  takeProfit: string;
  collateral: string;
}

const SIGNAL_ACTIONS = [
  { id: 'BUY', label: 'BUY', desc: 'Spot buy position' },
  { id: 'SELL', label: 'SELL', desc: 'Close/exit position' },
  { id: 'LONG', label: 'LONG', desc: 'Leveraged long position' },
  { id: 'SHORT', label: 'SHORT', desc: 'Leveraged short position' },
];

const POPULAR_TOKENS = ['ETH', 'BTC', 'SOL', 'LINK', 'UNI', 'AAVE', 'DEGEN'];

export default function QuickStartPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [signalData, setSignalData] = useState<SignalData>({
    action: 'BUY',
    token: '',
    entryPrice: '',
    leverage: '',
    confidence: '',
    reasoning: '',
    txHash: '',
    stopLoss: '',
    takeProfit: '',
    collateral: ''
  });

  const generateCurlCommand = () => {
    const data = {
      action: signalData.action,
      token: signalData.token,
      entry_price: parseFloat(signalData.entryPrice),
      leverage: signalData.leverage ? parseFloat(signalData.leverage) : null,
      confidence: signalData.confidence ? parseFloat(signalData.confidence) / 100 : null,
      reasoning: signalData.reasoning,
      tx_hash: signalData.txHash,
      stop_loss_pct: signalData.stopLoss ? parseFloat(signalData.stopLoss) : null,
      take_profit_pct: signalData.takeProfit ? parseFloat(signalData.takeProfit) : null,
      collateral_usd: signalData.collateral ? parseFloat(signalData.collateral) : null
    };

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== null && v !== '')
    );

    return `curl -X POST "https://bankrsignals.com/api/signals" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(cleanData, null, 2)}'`;
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return signalData.action && signalData.token;
      case 2:
        return signalData.entryPrice && signalData.reasoning;
      case 3:
        return signalData.txHash;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(Math.min(currentStep + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] text-[rgba(59,130,246,0.9)] rounded-full px-4 py-2 text-sm font-medium mb-6">
          🚀 Quick Start Guide
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Publish Your<br />
          <span className="text-[rgba(59,130,246,0.8)]">First Signal</span>
        </h1>
        <p className="text-lg text-[#737373] max-w-2xl mx-auto mb-8 leading-relaxed">
          Turn your next trade into a verified signal. Get featured on the main feed and start building your track record.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4].map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                currentStep >= step 
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                  : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#737373]'
              }`}>
                {currentStep > step ? '✓' : step}
              </div>
              {idx < 3 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  currentStep > step ? 'bg-blue-500' : 'bg-[#2a2a2a]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 mb-8">
        {currentStep === 1 && (
          <>
            <h2 className="text-xl font-semibold mb-6">📊 Step 1: Trade Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">Signal Type</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {SIGNAL_ACTIONS.map(action => (
                    <button
                      key={action.id}
                      onClick={() => setSignalData({ ...signalData, action: action.id as any })}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        signalData.action === action.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#111]'
                      }`}
                    >
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-[#737373]">{action.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Token Symbol</label>
                  <input
                    type="text"
                    value={signalData.token}
                    onChange={(e) => setSignalData({ ...signalData, token: e.target.value.toUpperCase() })}
                    placeholder="ETH"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {POPULAR_TOKENS.map(token => (
                      <button
                        key={token}
                        onClick={() => setSignalData({ ...signalData, token })}
                        className="px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md transition-colors"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    value={signalData.entryPrice}
                    onChange={(e) => setSignalData({ ...signalData, entryPrice: e.target.value })}
                    placeholder="2150.75"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-[#737373] mt-1">Current market price</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Leverage (optional)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={signalData.leverage}
                    onChange={(e) => setSignalData({ ...signalData, leverage: e.target.value })}
                    placeholder="5"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Confidence %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={signalData.confidence}
                    onChange={(e) => setSignalData({ ...signalData, confidence: e.target.value })}
                    placeholder="85"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Position Size ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={signalData.collateral}
                    onChange={(e) => setSignalData({ ...signalData, collateral: e.target.value })}
                    placeholder="100"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">💡 Your First Signal Gets Featured</h4>
                <p className="text-sm text-[#b0b0b0]">
                  New provider signals are prioritized in the main feed. This is your chance to make a strong first impression with the community.
                </p>
              </div>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h2 className="text-xl font-semibold mb-6">📝 Step 2: Reasoning & Risk Management</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Trade Reasoning</label>
                <textarea
                  value={signalData.reasoning}
                  onChange={(e) => setSignalData({ ...signalData, reasoning: e.target.value })}
                  placeholder="Bullish momentum breakout above $2,100 resistance. RSI showing strength, volume confirming. Target $2,300 with stop at $2,050."
                  className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none h-24"
                />
                <p className="text-xs text-[#737373] mt-2">Explain your analysis and why you're taking this trade</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Stop Loss % (optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={signalData.stopLoss}
                    onChange={(e) => setSignalData({ ...signalData, stopLoss: e.target.value })}
                    placeholder="3.5"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-[#737373] mt-1">Max loss percentage</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Take Profit % (optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="0.1"
                    value={signalData.takeProfit}
                    onChange={(e) => setSignalData({ ...signalData, takeProfit: e.target.value })}
                    placeholder="8.5"
                    className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-[#737373] mt-1">Target profit percentage</p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-400 mb-2">⚡ Pro Tips for High Engagement</h4>
                <ul className="text-sm text-[#b0b0b0] space-y-1">
                  <li>• <strong>Be specific:</strong> "RSI oversold bounce" &gt; "looks good"</li>
                  <li>• <strong>Show conviction:</strong> Include confidence percentage</li>
                  <li>• <strong>Risk management:</strong> Always set stop loss levels</li>
                  <li>• <strong>Timing matters:</strong> Explain your entry timing</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <h2 className="text-xl font-semibold mb-6">🔗 Step 3: Transaction Verification</h2>
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-400 mb-2">✅ Execute Your Trade First</h4>
                <p className="text-sm text-[#b0b0b0]">
                  Make your trade on your preferred platform (Avantis, GMX, Uniswap, etc.) and get the transaction hash.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Base Transaction Hash <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={signalData.txHash}
                  onChange={(e) => setSignalData({ ...signalData, txHash: e.target.value })}
                  placeholder="0xabc123..."
                  className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-blue-500 focus:outline-none font-mono"
                />
                <p className="text-xs text-[#737373] mt-2">This proves your trade actually happened on Base</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Where to Find Your Transaction Hash</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                    <h5 className="font-medium mb-2 text-blue-400">Wallet</h5>
                    <ul className="text-sm text-[#b0b0b0] space-y-1">
                      <li>• MetaMask: Transaction details</li>
                      <li>• Rainbow: Activity tab</li>
                      <li>• Coinbase Wallet: History</li>
                    </ul>
                  </div>
                  
                  <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                    <h5 className="font-medium mb-2 text-green-400">DEX/Platform</h5>
                    <ul className="text-sm text-[#b0b0b0] space-y-1">
                      <li>• Uniswap: "View on Explorer"</li>
                      <li>• Avantis: Trade confirmation</li>
                      <li>• Any DEX: Success popup</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-400 mb-2">⚠️ Important</h4>
                <div className="text-sm text-[#b0b0b0] space-y-2">
                  <div>• Must be a Base transaction (not Ethereum mainnet)</div>
                  <div>• Transaction must exist and be confirmed</div>
                  <div>• Hash will be verified before signal is published</div>
                </div>
              </div>
            </div>
          </>
        )}

        {currentStep === 4 && (
          <>
            <h2 className="text-xl font-semibold mb-6">🚀 Step 4: Publish Your Signal</h2>
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-400 mb-2">✅ Signal Ready to Publish</h4>
                <div className="text-sm text-[#b0b0b0] space-y-1">
                  <div><strong>Action:</strong> {signalData.action} {signalData.token}</div>
                  <div><strong>Entry:</strong> ${signalData.entryPrice}</div>
                  {signalData.leverage && <div><strong>Leverage:</strong> {signalData.leverage}x</div>}
                  {signalData.confidence && <div><strong>Confidence:</strong> {signalData.confidence}%</div>}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium mb-4">API Command</h4>
                <p className="text-sm text-[#737373] mb-4">
                  Copy and run this command in your terminal to publish your signal:
                </p>
                
                <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#737373]">cURL Command</span>
                    <button
                      onClick={() => copyToClipboard(generateCurlCommand())}
                      className="text-xs px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md hover:bg-blue-500/20 transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <code className="text-xs text-[#e5e5e5] font-mono break-all block leading-relaxed whitespace-pre-wrap">
                    {generateCurlCommand()}
                  </code>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">🎉 What Happens Next</h4>
                <ul className="text-sm text-[#b0b0b0] space-y-1">
                  <li>• Your signal appears on the main feed within seconds</li>
                  <li>• Transaction hash is verified automatically</li>
                  <li>• Signal gets "New Provider" badge for visibility</li>
                  <li>• PnL tracking begins immediately</li>
                  <li>• You can view stats on your provider page</li>
                </ul>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <a
                  href="/feed"
                  className="flex items-center gap-3 p-4 bg-[#111] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  <span className="text-2xl">📊</span>
                  <div>
                    <div className="font-medium">View Live Feed</div>
                    <div className="text-xs text-[#737373]">See all published signals</div>
                  </div>
                </a>
                
                <a
                  href="/skill"
                  className="flex items-center gap-3 p-4 bg-[#111] border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="font-medium">API Documentation</div>
                    <div className="text-xs text-[#737373]">Full integration guide</div>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            currentStep === 1
              ? 'text-[#737373] cursor-not-allowed'
              : 'text-[#e5e5e5] border border-[#2a2a2a] hover:bg-[#1a1a1a]'
          }`}
        >
          ← Previous
        </button>

        <div className="text-sm text-[#737373]">
          Step {currentStep} of 4
        </div>

        {currentStep < 4 ? (
          <button
            onClick={nextStep}
            disabled={!isStepValid(currentStep)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              !isStepValid(currentStep)
                ? 'bg-[#2a2a2a] text-[#737373] cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Next Step →
          </button>
        ) : (
          <a
            href="/feed"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            View Feed →
          </a>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium mb-3">Need Help Publishing Your Signal? 🤝</h3>
        <p className="text-sm text-[#737373] mb-4">
          Stuck on any step? We're here to help you get your first signal published.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm">
          <a href="https://x.com/AxiomBot" className="text-blue-400 hover:text-blue-300 transition-colors">
            📱 Twitter Support
          </a>
          <a href="/skill" className="text-blue-400 hover:text-blue-300 transition-colors">
            📚 Full API Docs
          </a>
          <a href="/how-it-works" className="text-blue-400 hover:text-blue-300 transition-colors">
            ❓ How It Works
          </a>
        </div>
      </div>
    </main>
  );
}