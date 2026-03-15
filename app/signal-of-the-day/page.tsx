'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpIcon, ArrowDownIcon, ShareIcon, ClipboardIcon } from '@heroicons/react/24/outline';

interface SignalOfTheDayData {
  signal: any;
  tweetText: string;
  isOpen: boolean;
  message: string;
}

export default function SignalOfTheDay() {
  const [data, setData] = useState<SignalOfTheDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSignalOfTheDay();
  }, []);

  const fetchSignalOfTheDay = async () => {
    try {
      const response = await fetch('/api/signal-of-the-day');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching signal of the day:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyTweetText = async () => {
    if (data?.tweetText) {
      try {
        await navigator.clipboard.writeText(data.tweetText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy text:', error);
      }
    }
  };

  const formatPnL = (pnl: number) => {
    const formatted = pnl > 0 ? `+${pnl.toFixed(1)}%` : `${pnl.toFixed(1)}%`;
    return pnl > 0 ? (
      <span className="text-green-500 font-semibold">{formatted}</span>
    ) : (
      <span className="text-red-500 font-semibold">{formatted}</span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading Signal of the Day...</div>
        </div>
      </div>
    );
  }

  if (!data?.signal) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">📊 Signal of the Day</h1>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400">No signals available for today.</p>
            <Link href="/" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { signal, tweetText, isOpen, message } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold mb-2">📊 Signal of the Day</h1>
          <p className="text-gray-400">{message}</p>
        </div>

        {/* Signal Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                signal.action === 'long' 
                  ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                  : 'bg-red-600/20 text-red-400 border border-red-600/30'
              }`}>
                {signal.action === 'long' ? (
                  <><ArrowUpIcon className="w-3 h-3 inline mr-1" /> LONG</>
                ) : (
                  <><ArrowDownIcon className="w-3 h-3 inline mr-1" /> SHORT</>
                )}
              </span>
              <span className="text-2xl font-bold">${signal.asset.toUpperCase()}</span>
              {signal.leverage && (
                <span className="text-orange-400 font-semibold">{signal.leverage}x</span>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatPnL(signal.pnl_pct)}
              </div>
              <div className={`text-sm px-2 py-1 rounded ${
                isOpen 
                  ? 'bg-blue-600/20 text-blue-400' 
                  : 'bg-gray-600/20 text-gray-400'
              }`}>
                {isOpen ? 'LIVE' : 'CLOSED'}
              </div>
            </div>
          </div>

          {signal.reasoning && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Reasoning</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{signal.reasoning}</p>
            </div>
          )}

          <div className="border-t border-gray-700 pt-4 mt-4">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div>
                By {signal.providers?.name || 'Anonymous'}
                {signal.providers?.twitter && (
                  <span className="text-blue-400 ml-1">@{signal.providers.twitter}</span>
                )}
              </div>
              <div>
                {new Date(signal.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Tweet Text */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShareIcon className="w-5 h-5" />
              Ready to Share
            </h3>
            <button
              onClick={copyTweetText}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <ClipboardIcon className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Tweet'}
            </button>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm leading-relaxed whitespace-pre-line">
            {tweetText}
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Ready to post on Twitter/X or any social platform
          </p>
        </div>

        {/* View Signal Link */}
        <div className="mt-6 text-center">
          <Link 
            href={`/provider/${signal.provider_address}`}
            className="text-blue-400 hover:text-blue-300"
          >
            View all signals from {signal.providers?.name || 'this provider'} →
          </Link>
        </div>
      </div>
    </div>
  );
}