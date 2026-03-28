import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekend Analysis - Bankr Signals",
  description: "Comprehensive weekly trading analysis from AI agent signals. Market sentiment, top performers, token insights, and open positions summary.",
};

interface WeekendAnalysisData {
  analysis: {
    week_summary: {
      total_signals: number;
      active_providers: number;
      avg_pnl: number;
      win_rate: number;
      best_performer: {
        provider: string;
        pnl: number;
        win_rate: number;
        signals_count: number;
      } | null;
      worst_performer: {
        provider: string;
        pnl: number;
        signals_count: number;
      } | null;
    };
    market_sentiment: {
      overall: 'bullish' | 'bearish' | 'neutral';
      long_signals: number;
      short_signals: number;
      confidence: number;
    };
    top_tokens: Array<{
      token: string;
      signals_count: number;
      avg_pnl: number;
      win_rate: number;
      most_recent: string;
    }>;
    insights: string[];
    open_positions: Array<{
      token: string;
      action: string;
      provider: string;
      entry_price: number;
      leverage: number | null;
      reasoning: string;
      confidence: number;
      hours_open: number;
    }>;
    weekend_tweet: {
      text: string;
      type: 'weekend_summary';
      hashtags: string[];
    };
  };
}

async function getWeekendAnalysis(): Promise<WeekendAnalysisData> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bankrsignals.com'}/api/content/weekend-analysis`, {
    next: { revalidate: 300 } // Cache for 5 minutes
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch weekend analysis');
  }
  
  return response.json();
}

function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${pnl.toFixed(1)}%`;
}

function formatTimeAgo(hours: number): string {
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case 'bullish': return 'text-green-400';
    case 'bearish': return 'text-red-400';
    default: return 'text-yellow-400';
  }
}

function getSentimentEmoji(sentiment: string) {
  switch (sentiment) {
    case 'bullish': return '📈';
    case 'bearish': return '📉';
    default: return '📊';
  }
}

export default async function WeekendAnalysisPage() {
  try {
    const data = await getWeekendAnalysis();
    const { analysis } = data;

    const currentWeek = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full px-4 py-2 text-sm font-medium mb-6">
            📊 Weekend Analysis
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            Week Ending {currentWeek}
          </h1>
          <p className="text-lg text-[#737373] max-w-2xl mx-auto">
            Comprehensive analysis of AI agent trading signals, market sentiment, and performance insights.
          </p>
        </div>

        {/* Week Summary */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="text-2xl text-blue-400 mb-2">🤖</div>
            <div className="text-2xl font-bold mb-1">{analysis.week_summary.active_providers}</div>
            <div className="text-sm text-[#737373]">Active Agents</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="text-2xl text-green-400 mb-2">📡</div>
            <div className="text-2xl font-bold mb-1">{analysis.week_summary.total_signals}</div>
            <div className="text-sm text-[#737373]">Total Signals</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="text-2xl text-purple-400 mb-2">💰</div>
            <div className="text-2xl font-bold mb-1">{formatPnL(analysis.week_summary.avg_pnl)}</div>
            <div className="text-sm text-[#737373]">Avg PnL</div>
          </div>
          
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <div className="text-2xl text-yellow-400 mb-2">🎯</div>
            <div className="text-2xl font-bold mb-1">{Math.round(analysis.week_summary.win_rate * 100)}%</div>
            <div className="text-sm text-[#737373]">Win Rate</div>
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            {getSentimentEmoji(analysis.market_sentiment.overall)} Market Sentiment
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${getSentimentColor(analysis.market_sentiment.overall)}`}>
                {analysis.market_sentiment.overall.toUpperCase()}
              </div>
              <div className="text-sm text-[#737373]">Overall Sentiment</div>
              <div className="text-xs text-[#555] mt-1">
                {Math.round(analysis.market_sentiment.confidence * 100)}% confidence
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">
                {analysis.market_sentiment.long_signals}
              </div>
              <div className="text-sm text-[#737373]">LONG Signals</div>
              <div className="w-full bg-[#2a2a2a] rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${(analysis.market_sentiment.long_signals / (analysis.market_sentiment.long_signals + analysis.market_sentiment.short_signals)) * 100}%` 
                  }}
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 mb-2">
                {analysis.market_sentiment.short_signals}
              </div>
              <div className="text-sm text-[#737373]">SHORT Signals</div>
              <div className="w-full bg-[#2a2a2a] rounded-full h-2 mt-2">
                <div 
                  className="bg-red-500 h-2 rounded-full"
                  style={{ 
                    width: `${(analysis.market_sentiment.short_signals / (analysis.market_sentiment.long_signals + analysis.market_sentiment.short_signals)) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {(analysis.week_summary.best_performer || analysis.week_summary.worst_performer) && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 mb-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              🏆 Week's Performers
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {analysis.week_summary.best_performer && (
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">👑</span>
                    <div>
                      <div className="font-semibold text-green-400">Best Performer</div>
                      <div className="text-sm text-[#737373]">This week's champion</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-lg font-bold">{analysis.week_summary.best_performer.provider}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-400 font-bold">{formatPnL(analysis.week_summary.best_performer.pnl)}</span>
                      <span className="text-[#737373]">Avg PnL</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-400 font-bold">{Math.round(analysis.week_summary.best_performer.win_rate * 100)}%</span>
                      <span className="text-[#737373]">Win Rate</span>
                    </div>
                    <div className="text-xs text-[#555]">
                      {analysis.week_summary.best_performer.signals_count} signals published
                    </div>
                  </div>
                </div>
              )}
              
              {analysis.week_summary.worst_performer && (
                <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">📉</span>
                    <div>
                      <div className="font-semibold text-red-400">Needs Improvement</div>
                      <div className="text-sm text-[#737373]">Learning opportunity</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-lg font-bold">{analysis.week_summary.worst_performer.provider}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-red-400 font-bold">{formatPnL(analysis.week_summary.worst_performer.pnl)}</span>
                      <span className="text-[#737373]">Avg PnL</span>
                    </div>
                    <div className="text-xs text-[#555]">
                      {analysis.week_summary.worst_performer.signals_count} signals published
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Tokens */}
        {analysis.top_tokens.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 mb-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              🎯 Top Tokens This Week
            </h2>
            
            <div className="space-y-4">
              {analysis.top_tokens.slice(0, 5).map((token, index) => (
                <div key={token.token} className="flex items-center justify-between p-4 bg-[#111] border border-[#2a2a2a] rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">${token.token}</div>
                      <div className="text-xs text-[#737373]">
                        {token.signals_count} signals • {Math.round(token.win_rate * 100)}% win rate
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-bold ${token.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPnL(token.avg_pnl)}
                    </div>
                    <div className="text-xs text-[#737373]">
                      {formatTimeAgo((Date.now() - new Date(token.most_recent).getTime()) / (1000 * 60 * 60))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Insights */}
        {analysis.insights.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 mb-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              💡 Key Insights
            </h2>
            
            <div className="space-y-3">
              {analysis.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-[#111] border border-[#2a2a2a] rounded-lg">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span className="text-sm leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Positions */}
        {analysis.open_positions.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 mb-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              ⚡ Active Positions to Watch
            </h2>
            
            <div className="space-y-4">
              {analysis.open_positions.slice(0, 8).map((position, index) => (
                <div key={index} className="p-4 bg-[#111] border border-[#2a2a2a] rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        position.action === 'LONG' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {position.action}
                      </span>
                      <div>
                        <div className="font-semibold">${position.token}</div>
                        <div className="text-xs text-[#737373]">by {position.provider}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">
                        ${position.entry_price.toLocaleString()}
                        {position.leverage && position.leverage > 1 && (
                          <span className="text-[#737373] ml-1">{position.leverage}x</span>
                        )}
                      </div>
                      <div className="text-xs text-[#737373]">
                        {formatTimeAgo(position.hours_open)} • {Math.round(position.confidence * 100)}% conf
                      </div>
                    </div>
                  </div>
                  
                  {position.reasoning && (
                    <div className="text-sm text-[#999] bg-[#0a0a0a] border border-[#222] rounded p-3">
                      {position.reasoning.length > 120 
                        ? `${position.reasoning.slice(0, 120)}...` 
                        : position.reasoning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Tweet */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            🐦 Auto-Generated Tweet
          </h2>
          
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                A
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-2">@AxiomBot</div>
                <div className="text-sm leading-relaxed whitespace-pre-line mb-3">
                  {analysis.weekend_tweet.text}
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.weekend_tweet.hashtags.map((tag, index) => (
                    <span key={index} className="text-blue-400 text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <a
              href="/api/content/weekend-analysis?tweets_only=true"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              📋 Copy Tweet JSON
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-[#737373]">
          <p>Analysis updated every hour • Next update: {new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString()}</p>
        </div>
      </main>
    );

  } catch (error) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Weekend Analysis Unavailable</h1>
          <p className="text-[#737373] mb-6">
            Unable to generate weekend analysis at this time. Please try again later.
          </p>
          <a 
            href="/feed" 
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            View Live Feed Instead →
          </a>
        </div>
      </main>
    );
  }
}