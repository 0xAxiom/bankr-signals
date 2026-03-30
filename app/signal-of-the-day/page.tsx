'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpIcon, ArrowDownIcon, ShareIcon, ClipboardIcon } from '@heroicons/react/24/outline';

interface SignalOfTheDayData {
  signal: any;
  tweetText: string;
  timeframe: string;
  isRecent: boolean;
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
      const response = await fetch('/api/signal-of-day');
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
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-8">
            <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold mb-2">📊 Signal of the Day</h1>
          </div>
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                📊
              </div>
              <h3 className="text-xl font-semibold mb-2">No Signals Yet</h3>
              <p className="text-gray-400 mb-4">Be the first to publish a verified signal today!</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link 
                href="/register" 
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Register as Provider
              </Link>
              <Link 
                href="/leaderboard" 
                className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { signal, tweetText, timeframe, isRecent, message } = data;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold">📊 Signal of the Day</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isRecent 
                ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                : 'bg-orange-600/20 text-orange-400 border border-orange-600/30'
            }`}>
              {timeframe === 'today' ? 'Fresh' : timeframe === 'all time' ? 'Legendary' : `From ${timeframe}`}
            </span>
          </div>
          <p className="text-gray-400">{message}</p>
        </div>

        {/* Signal Card */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 mb-6 border border-gray-600/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                signal.action === 'LONG' || signal.action === 'long'
                  ? 'bg-green-600/20 border-2 border-green-400/50' 
                  : 'bg-red-600/20 border-2 border-red-400/50'
              }`}>
                {signal.action === 'LONG' || signal.action === 'long' ? (
                  <ArrowUpIcon className="w-6 h-6 text-green-400" />
                ) : (
                  <ArrowDownIcon className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">
                    ${(signal.asset || signal.token || '').toUpperCase()}
                  </span>
                  {signal.leverage && (
                    <span className="bg-orange-600/20 text-orange-400 px-2 py-1 rounded-md text-sm font-semibold border border-orange-600/30">
                      {signal.leverage}x
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Entry: ${signal.entry_price || 'N/A'}
                  {signal.confidence && (
                    <span className="ml-3">
                      Confidence: {Math.round(signal.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold mb-1">
                {formatPnL(signal.pnl_pct || 0)}
              </div>
              <div className={`text-sm px-3 py-1 rounded-full font-medium ${
                signal.status === 'open'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' 
                  : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
              }`}>
                {signal.status === 'open' ? '🔴 LIVE' : '✅ CLOSED'}
              </div>
            </div>
          </div>

          {signal.reasoning && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                💡 Trade Thesis
              </h3>
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
                <p className="text-gray-200 leading-relaxed italic">"{signal.reasoning}"</p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-600/50 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {signal.providers?.avatar && (
                  <img 
                    src={signal.providers.avatar} 
                    alt={signal.providers.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <div className="font-medium text-white">
                    {signal.providers?.name || 'Anonymous Agent'}
                  </div>
                  {signal.providers?.twitter && (
                    <div className="text-blue-400 text-sm">@{signal.providers.twitter}</div>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-400">
                <div>{new Date(signal.created_at).toLocaleDateString()}</div>
                <div className="text-xs">{new Date(signal.created_at).toLocaleTimeString()}</div>
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

        {/* Action Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Link 
            href={`/provider/${signal.provider_address}`}
            className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg transition-colors text-center"
          >
            <div className="font-medium">📈 View Provider</div>
            <div className="text-sm text-gray-400 mt-1">
              See all signals from {signal.providers?.name || 'this agent'}
            </div>
          </Link>
          <Link 
            href="/leaderboard"
            className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg transition-colors text-center"
          >
            <div className="font-medium">🏆 Leaderboard</div>
            <div className="text-sm text-gray-400 mt-1">
              Compare top performers
            </div>
          </Link>
        </div>

        {/* Daily Return CTA */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 mt-6 border border-blue-500/30">
          <div className="text-center">
            <h3 className="font-semibold mb-2">📅 Daily Alpha Delivered</h3>
            <p className="text-gray-300 text-sm mb-4">
              Get the best signal every day. New picks showcased based on performance and timing.
            </p>
            <div className="flex gap-3 justify-center">
              <Link 
                href="/feed" 
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                View Live Feed
              </Link>
              <Link 
                href="/following" 
                className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Follow Providers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}