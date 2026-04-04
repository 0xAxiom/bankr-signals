'use client';

import React, { useState } from 'react';
import { CheckIcon, TrendingUpIcon, AlertCircleIcon } from 'lucide-react';

interface CopySubscribeFormProps {
  provider: {
    address: string;
    name: string;
    pnl_pct: number;
    win_rate: number;
    signal_count: number;
  };
  defaultPositionSize?: number;
  onSuccess?: () => void;
}

export default function CopySubscribeForm({ provider, defaultPositionSize = 10, onSuccess }: CopySubscribeFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    telegramUsername: '',
    webhook: '',
    positionSize: defaultPositionSize
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/copy-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          providerAddress: provider.address,
          telegramUsername: formData.telegramUsername,
          webhook: formData.webhook,
          positionSize: formData.positionSize
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckIcon className="w-6 h-6 text-[rgba(34,197,94,0.8)]" />
          <h3 className="text-lg font-semibold text-[rgba(34,197,94,0.8)]">Successfully Subscribed!</h3>
        </div>
        <p className="text-[rgba(34,197,94,0.7)] mb-4">
          You&apos;ll receive real-time trading signals from <strong>{provider.name}</strong> via email.
          {formData.telegramUsername && ' Telegram notifications will be available soon.'}
        </p>
        <div className="bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.2)] rounded-lg p-4">
          <h4 className="font-medium text-[rgba(34,197,94,0.8)] mb-2">What happens next?</h4>
          <ul className="text-sm text-[rgba(34,197,94,0.7)] space-y-1">
            <li>• Real-time signal notifications via email</li>
            <li>• Position sizing recommendations ({formData.positionSize}% per trade)</li>
            <li>• Entry/exit price alerts</li>
            <li>• Performance tracking dashboard</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUpIcon className="w-6 h-6 text-[rgba(34,197,94,0.6)]" />
        <div>
          <h3 className="text-lg font-semibold text-[#e5e5e5]">Subscribe to Copy {provider.name}</h3>
          <p className="text-sm text-[#737373]">
            Get real-time signals • {provider.pnl_pct.toFixed(1)}% Total PnL • {provider.win_rate.toFixed(1)}% Win Rate
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e5e5e5] rounded-lg px-3 py-2 focus:border-[rgba(34,197,94,0.6)] focus:outline-none"
            placeholder="your@email.com"
            required
          />
        </div>

        {/* Position Size */}
        <div>
          <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
            Position Size (% of portfolio per signal)
          </label>
          <div className="space-y-2">
            <input
              type="range"
              value={formData.positionSize}
              onChange={(e) => setFormData(prev => ({ ...prev, positionSize: Number(e.target.value) }))}
              className="w-full accent-[rgba(34,197,94,0.6)]"
              min="1"
              max="50"
            />
            <div className="flex justify-between text-xs text-[#737373]">
              <span>1% (Conservative)</span>
              <span className="font-medium text-[#e5e5e5]">{formData.positionSize}%</span>
              <span>50% (Aggressive)</span>
            </div>
          </div>
        </div>

        {/* Optional: Telegram Username */}
        <div>
          <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
            Telegram Username <span className="text-[#555]">(optional, coming soon)</span>
          </label>
          <input
            type="text"
            value={formData.telegramUsername}
            onChange={(e) => setFormData(prev => ({ ...prev, telegramUsername: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e5e5e5] rounded-lg px-3 py-2 focus:border-[rgba(34,197,94,0.6)] focus:outline-none opacity-60"
            placeholder="@yourusername"
            disabled
          />
        </div>

        {/* Optional: Webhook */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-[#737373] hover:text-[#a3a3a3] transition-colors">
            Advanced: Custom Webhook (optional)
          </summary>
          <div className="mt-3">
            <input
              type="url"
              value={formData.webhook}
              onChange={(e) => setFormData(prev => ({ ...prev, webhook: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#e5e5e5] rounded-lg px-3 py-2 focus:border-[rgba(34,197,94,0.6)] focus:outline-none"
              placeholder="https://your-webhook.com/signals"
            />
            <p className="text-xs text-[#555] mt-1">
              Receive JSON signal data at your endpoint for automated trading
            </p>
          </div>
        </details>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Risk Warning */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircleIcon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-400 text-sm font-medium mb-1">Risk Warning</p>
              <p className="text-amber-400/80 text-xs leading-relaxed">
                Copy trading involves significant risk. Past performance does not guarantee future results. 
                Only trade with money you can afford to lose. You are responsible for all trading decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !formData.email}
          className="w-full bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.9)] font-semibold py-3 px-6 rounded-lg transition-all hover:bg-[rgba(34,197,94,0.25)] disabled:bg-[#2a2a2a] disabled:border-[#2a2a2a] disabled:text-[#737373] disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe to Copy Signals'}
        </button>
      </form>

      {/* Feature List */}
      <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
        <h4 className="text-sm font-medium text-[#a3a3a3] mb-3">What you get:</h4>
        <ul className="space-y-2 text-xs text-[#737373]">
          <li className="flex items-center gap-2">
            <CheckIcon className="w-3 h-3 text-[rgba(34,197,94,0.6)]" />
            Real-time email notifications for new signals
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-3 h-3 text-[rgba(34,197,94,0.6)]" />
            Entry & exit price alerts with reasoning
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-3 h-3 text-[rgba(34,197,94,0.6)]" />
            Position sizing recommendations
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-3 h-3 text-[rgba(34,197,94,0.6)]" />
            Performance tracking dashboard
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-3 h-3 text-[rgba(34,197,94,0.6)]" />
            Unsubscribe anytime
          </li>
        </ul>
      </div>
    </div>
  );
}