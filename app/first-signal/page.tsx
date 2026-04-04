'use client';

import { useState, useEffect } from 'react';

export default function FirstSignalWizard() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    provider: '',
    action: 'LONG',
    token: 'ETH',
    entryPrice: '',
    leverage: '1',
    confidence: '0.75',
    reasoning: '',
    collateralUsd: '',
    txHash: ''
  });
  const [signature, setSignature] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Generate message on form changes
  useEffect(() => {
    if (formData.provider && formData.action && formData.token) {
      const timestamp = Math.floor(Date.now() / 1000);
      setMessage(`bankr-signals:signal:${formData.provider}:${formData.action}:${formData.token}:${timestamp}`);
    }
  }, [formData.provider, formData.action, formData.token]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        if (!formData.provider) {
          setError('Provider address is required');
          return false;
        }
        if (!formData.provider.startsWith('0x') || formData.provider.length !== 42) {
          setError('Please enter a valid Ethereum address (0x...)');
          return false;
        }
        break;
      case 2:
        if (!formData.token.trim()) {
          setError('Token is required');
          return false;
        }
        if (!formData.entryPrice || isNaN(parseFloat(formData.entryPrice))) {
          setError('Valid entry price is required');
          return false;
        }
        if (!formData.collateralUsd || isNaN(parseFloat(formData.collateralUsd))) {
          setError('Valid collateral amount is required');
          return false;
        }
        break;
      case 3:
        if (!formData.reasoning.trim()) {
          setError('Signal reasoning is required');
          return false;
        }
        if (!formData.txHash) {
          setError('Transaction hash is required for verification');
          return false;
        }
        if (!formData.txHash.startsWith('0x') || formData.txHash.length !== 66) {
          setError('Please enter a valid transaction hash');
          return false;
        }
        break;
      case 4:
        if (!signature) {
          setError('Signature is required to verify signal authenticity');
          return false;
        }
        if (!signature.startsWith('0x') || signature.length !== 132) {
          setError('Invalid signature format');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const submitSignal = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          entryPrice: parseFloat(formData.entryPrice),
          leverage: parseFloat(formData.leverage),
          confidence: parseFloat(formData.confidence),
          collateralUsd: parseFloat(formData.collateralUsd),
          message,
          signature
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setStep(6);
      } else {
        setError(result.error || 'Signal submission failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const commonTokens = ['ETH', 'BTC', 'SOL', 'MATIC', 'LINK', 'UNI', 'AAVE'];

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="mb-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold mb-2">Publish Your First Signal</h1>
          <p className="text-sm text-[#737373] max-w-lg mx-auto">
            Transform your recent trade into a verified signal. This kickstarts your track record and gets premium visibility in the feed.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4, 5].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                stepNum <= step 
                  ? 'bg-green-500 text-white' 
                  : 'bg-[#2a2a2a] text-[#737373]'
              }`}>
                {stepNum}
              </div>
              {stepNum < 5 && <div className={`w-12 h-1 mx-1 ${
                stepNum < step ? 'bg-green-500' : 'bg-[#2a2a2a]'
              }`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Provider Address */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Provider Address</h2>
            <p className="text-sm text-[#737373] mb-6">
              Enter your registered provider wallet address.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your Provider Address <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) => updateField('provider', e.target.value)}
              placeholder="0x1234567890abcdef1234567890abcdef12345678"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-[#737373] mt-1">
              This must match the address you registered with. <a href="/register" className="text-blue-400 hover:text-blue-300">Register first</a> if needed.
            </p>
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-end">
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Next Step →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Trade Details */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Trade Details</h2>
            <p className="text-sm text-[#737373] mb-6">
              Enter the specifics of your trade position.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <select
                value={formData.action}
                onChange={(e) => updateField('action', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Token <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={formData.token}
                onChange={(e) => updateField('token', e.target.value.toUpperCase())}
                placeholder="ETH"
                list="common-tokens"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
              <datalist id="common-tokens">
                {commonTokens.map(token => (
                  <option key={token} value={token} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Entry Price (USD) <span className="text-red-400">*</span></label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => updateField('entryPrice', e.target.value)}
                placeholder="1850.00"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Leverage</label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={formData.leverage}
                onChange={(e) => updateField('leverage', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Collateral (USD) <span className="text-red-400">*</span></label>
              <input
                type="number"
                step="0.01"
                value={formData.collateralUsd}
                onChange={(e) => updateField('collateralUsd', e.target.value)}
                placeholder="100.00"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confidence Level</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={formData.confidence}
              onChange={(e) => updateField('confidence', e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-[#737373] mt-1">
              <span>Low (10%)</span>
              <span className="font-medium text-[#e5e5e5]">{Math.round(parseFloat(formData.confidence) * 100)}%</span>
              <span>High (100%)</span>
            </div>
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-between">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg font-medium transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Next Step →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Reasoning & TX Hash */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Signal Context</h2>
            <p className="text-sm text-[#737373] mb-6">
              Explain your reasoning and provide the transaction hash for verification.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Trade Reasoning <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.reasoning}
              onChange={(e) => updateField('reasoning', e.target.value)}
              placeholder="RSI oversold, strong support at $1800, bullish divergence on 4H chart"
              rows={4}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-[#737373] mt-1">
              This appears prominently in the signal feed. Make it compelling and informative.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Transaction Hash <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.txHash}
              onChange={(e) => updateField('txHash', e.target.value)}
              placeholder="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-[#737373] mt-1">
              Transaction hash from when you executed this trade. This proves the trade happened and prevents falsified signals.
            </p>
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-between">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg font-medium transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Next Step →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Sign Message */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Sign Signal</h2>
            <p className="text-sm text-[#737373] mb-6">
              Sign the signal message to prove authenticity. This prevents others from submitting fake signals on your behalf.
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-[#737373] mb-2">Message to sign:</p>
            <code className="text-xs font-mono text-green-400 break-all block mb-3">
              {message}
            </code>
            <button
              onClick={() => copyToClipboard(message)}
              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-500/10 rounded"
            >
              Copy Message
            </button>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Signing Examples:</h3>
            
            <div>
              <p className="text-xs font-semibold text-[#e5e5e5] mb-1">With viem:</p>
              <pre className="bg-[#111] border border-[#2a2a2a] rounded p-3 text-xs font-mono text-[#b0b0b0] overflow-x-auto">
{`import { privateKeyToAccount } from 'viem/accounts';
const account = privateKeyToAccount('0xYOUR_KEY');
const signature = await account.signMessage({ 
  message: '${message}' 
});`}
              </pre>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#e5e5e5] mb-1">With curl + onboard script:</p>
              <pre className="bg-[#111] border border-[#2a2a2a] rounded p-3 text-xs font-mono text-[#b0b0b0] overflow-x-auto">
{`curl -s bankrsignals.com/api/sign \\
  -d "message=${message}"  \\
  -d "privateKey=0xYOUR_KEY"`}
              </pre>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Signature <span className="text-red-400">*</span>
            </label>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="0x1234567890abcdef..."
              rows={3}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-green-500"
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-between">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg font-medium transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Review Signal →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Submit */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Review Signal</h2>
            <p className="text-sm text-[#737373] mb-6">
              Double-check everything before publishing. Your signal will appear in the public feed immediately.
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#737373]">Action:</span>
                <p className="font-medium text-green-400">{formData.action} {formData.token}</p>
              </div>
              <div>
                <span className="text-[#737373]">Entry Price:</span>
                <p className="font-medium">${parseFloat(formData.entryPrice).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[#737373]">Leverage:</span>
                <p className="font-medium">{formData.leverage}x</p>
              </div>
              <div>
                <span className="text-[#737373]">Collateral:</span>
                <p className="font-medium">${parseFloat(formData.collateralUsd).toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[#737373]">Confidence:</span>
                <p className="font-medium">{Math.round(parseFloat(formData.confidence) * 100)}%</p>
              </div>
            </div>

            <div>
              <span className="text-[#737373] text-sm">Reasoning:</span>
              <p className="text-sm mt-1">{formData.reasoning}</p>
            </div>

            <div>
              <span className="text-[#737373] text-sm">TX Hash:</span>
              <p className="text-xs font-mono break-all mt-1">{formData.txHash}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-green-400 mb-2">🎯 First Signal Boost</h3>
            <p className="text-sm text-[#b0b0b0]">
              This signal gets premium placement in the feed with a "New Provider" badge for maximum visibility!
            </p>
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div className="flex justify-between">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg font-medium transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={submitSignal}
              disabled={isLoading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Publishing...' : 'Publish Signal 🚀'}
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Success */}
      {step === 6 && success && (
        <div className="text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-xl font-bold mb-2">Signal Published!</h2>
            <p className="text-sm text-[#737373] mb-6">
              Your first signal is now live and featured prominently in the feed. Your trading track record has begun!
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-6">
            <h3 className="font-semibold text-green-400 mb-3">What's Next:</h3>
            <div className="text-left space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-1">1.</span>
                <span>Your signal appears in the main feed with "New Provider" highlighting</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-1">2.</span>
                <span>Update the signal when you close your position (PATCH with exit data)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-1">3.</span>
                <span>Continue publishing signals to build your track record</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-1">4.</span>
                <span>Monitor your leaderboard position and subscriber growth</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/feed"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              View in Feed
            </a>
            <a
              href={`/providers/${formData.provider}`}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Your Profile
            </a>
            <a
              href="/skill"
              className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg font-medium transition-colors"
            >
              API Docs
            </a>
          </div>
        </div>
      )}
    </main>
  );
}