'use client';

import { useState } from 'react';
import Link from 'next/link';

interface QuickSignalData {
  action: 'LONG' | 'SHORT';
  token: string;
  entryPrice: string;
  leverage: string;
  reasoning: string;
  confidence: string;
}

export default function QuickPublishPage() {
  const [formData, setFormData] = useState<QuickSignalData>({
    action: 'LONG',
    token: 'ETH',
    entryPrice: '',
    leverage: '1',
    reasoning: '',
    confidence: '0.7'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popularTokens = ['ETH', 'BTC', 'SOL', 'AVAX', 'LINK', 'UNI', 'AAVE'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.entryPrice || !formData.reasoning) {
        setError('Entry price and reasoning are required');
        return;
      }

      const response = await fetch('/api/signals/quick-publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          entryPrice: parseFloat(formData.entryPrice),
          leverage: parseInt(formData.leverage),
          confidence: parseFloat(formData.confidence)
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish signal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasoningExamples = [
    "RSI oversold at 25, expecting bounce off $3,200 support",
    "Breaking above $95k resistance with strong volume",
    "DeFi narrative heating up, fundamentals strong",
    "Technical consolidation complete, ready for next leg up",
    "Market sentiment shift, institutional buying pressure"
  ];

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Signal Published Successfully!</h1>
          <p className="text-[#737373] mb-8">
            Your signal is now live on the feed. Other traders can see your pick and reasoning.
          </p>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
            <h3 className="font-medium mb-4">🚀 What's Next?</h3>
            <div className="text-left space-y-3 text-sm text-[#b0b0b0]">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-medium">1</span>
                <span>Your signal appears on the live feed immediately</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-xs font-medium">2</span>
                <span>Build your track record by publishing more signals</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-xs font-medium">3</span>
                <span>Climb the leaderboard as your performance improves</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/feed"
              className="flex items-center justify-center gap-2 p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              📡 View Live Feed
            </Link>
            <Link
              href="/quick-publish"
              onClick={() => {
                setShowSuccess(false);
                setFormData({
                  action: 'LONG',
                  token: 'ETH', 
                  entryPrice: '',
                  leverage: '1',
                  reasoning: '',
                  confidence: '0.7'
                });
              }}
              className="flex items-center justify-center gap-2 p-4 border border-[#2a2a2a] hover:bg-[#1a1a1a] rounded-lg transition-colors font-medium"
            >
              ➕ Publish Another
            </Link>
          </div>

          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-400">
              💡 <strong>Pro Tip:</strong> Add transaction verification later for maximum credibility. 
              <Link href="/first-signal" className="underline ml-1">Set up full verification →</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full px-4 py-2 text-sm font-medium mb-4">
          ⚡ Quick Publish
        </div>
        <h1 className="text-3xl font-bold mb-4">Publish Your First Signal</h1>
        <p className="text-[#737373] mb-6">
          Share your trade idea in 30 seconds. No wallet signing required to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Signal Direction & Token */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              {(['LONG', 'SHORT'] as const).map(action => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setFormData({ ...formData, action })}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    formData.action === action
                      ? action === 'LONG'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'border border-[#2a2a2a] hover:bg-[#1a1a1a]'
                  }`}
                >
                  {action === 'LONG' ? '📈' : '📉'} {action}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Token</label>
            <div className="relative">
              <input
                type="text"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value.toUpperCase() })}
                placeholder="ETH"
                className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-green-500 focus:outline-none font-mono"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {popularTokens.map(token => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setFormData({ ...formData, token })}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      formData.token === token
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-[#1a1a1a] text-[#737373] hover:text-[#e5e5e5]'
                    }`}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Entry Price & Leverage */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Entry Price (USD)</label>
            <input
              type="number"
              step="0.01"
              value={formData.entryPrice}
              onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
              placeholder="3250.00"
              className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-green-500 focus:outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Leverage</label>
            <select
              value={formData.leverage}
              onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
              className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="1">1x (Spot)</option>
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
              <option value="20">20x</option>
            </select>
          </div>
        </div>

        {/* Confidence */}
        <div>
          <label className="block text-sm font-medium mb-2">Confidence Level</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={formData.confidence}
              onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
              className="flex-1"
            />
            <span className="text-sm font-mono bg-[#1a1a1a] px-3 py-2 rounded">
              {Math.round(parseFloat(formData.confidence) * 100)}%
            </span>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <label className="block text-sm font-medium mb-2">Why This Trade?</label>
          <textarea
            value={formData.reasoning}
            onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
            placeholder="RSI oversold, strong support at $3,200..."
            className="w-full px-4 py-3 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm focus:border-green-500 focus:outline-none h-24"
            required
          />
          <div className="mt-2">
            <p className="text-xs text-[#737373] mb-2">💡 Need inspiration? Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {reasoningExamples.slice(0, 3).map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFormData({ ...formData, reasoning: example })}
                  className="text-xs bg-[#1a1a1a] hover:bg-[#2a2a2a] px-2 py-1 rounded text-[#737373] hover:text-[#e5e5e5] transition-colors"
                >
                  "{example.slice(0, 30)}..."
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Preview */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">📊 Signal Preview</h3>
          <div className="text-sm text-[#b0b0b0] space-y-1">
            <div className="flex justify-between">
              <span>Signal:</span>
              <span className={formData.action === 'LONG' ? 'text-green-400' : 'text-red-400'}>
                {formData.action} {formData.token || '...'} 
                {formData.entryPrice && ` at $${formData.entryPrice}`}
                {formData.leverage !== '1' && ` (${formData.leverage}x)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Confidence:</span>
              <span>{Math.round(parseFloat(formData.confidence) * 100)}%</span>
            </div>
            {formData.reasoning && (
              <div className="pt-2">
                <span className="text-[#737373]">Reasoning:</span>
                <p className="mt-1 text-[#b0b0b0] italic">"{formData.reasoning}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !formData.entryPrice || !formData.reasoning}
          className={`w-full py-4 rounded-lg font-medium transition-colors ${
            isSubmitting || !formData.entryPrice || !formData.reasoning
              ? 'bg-[#2a2a2a] text-[#737373] cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isSubmitting ? 'Publishing...' : '🚀 Publish Signal'}
        </button>

        {/* Help */}
        <div className="text-center">
          <p className="text-xs text-[#737373] mb-2">
            Publishing a quick signal helps you get started. For maximum credibility:
          </p>
          <Link href="/first-signal" className="text-xs text-blue-400 hover:text-blue-300">
            Set up transaction verification →
          </Link>
        </div>
      </form>
    </div>
  );
}