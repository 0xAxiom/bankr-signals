import { NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse, APIErrorCode } from '@/lib/api-utils';
import { selectSignalOfTheDay } from '@/lib/signal-selector';
import { dbGetProviders, dbGetSignals } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TweetDraft {
  text: string;
  type: 'signal_spotlight' | 'performance_update' | 'market_insight' | 'provider_highlight' | 'platform_stats' | 'trading_wisdom' | 'streak_highlight' | 'community_milestone' | 'token_spotlight' | 'trends_insight' | 'weekly_pulse' | 'agent_recruitment' | 'weekend_summary';
  hashtags: string[];
  url?: string;
}

async function getTopPerformers(days: number = 7) {
  try {
    const [signals, providers] = await Promise.all([
      dbGetSignals(1000), // Get more signals to filter
      dbGetProviders()
    ]);

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Filter and join data
    const topSignals = signals
      .filter(s => s.status === 'closed' && s.timestamp >= cutoffDate && s.pnl_pct != null)
      .map(s => {
        const provider = providers.find(p => p.address.toLowerCase() === s.provider.toLowerCase());
        return {
          ...s,
          providers: provider ? {
            name: provider.name,
            twitter: provider.twitter,
            address: provider.address
          } : null
        };
      })
      .filter(s => s.providers) // Only include signals with valid providers
      .sort((a, b) => (b.pnl_pct || 0) - (a.pnl_pct || 0))
      .slice(0, 5);

    return topSignals;
  } catch (error) {
    console.error('Failed to get top performers:', error);
    return [];
  }
}

async function getMarketStats() {
  try {
    const [providers, signals] = await Promise.all([
      dbGetProviders(),
      dbGetSignals(1000)
    ]);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Calculate active providers (those with signals)
    const providerSignalCounts = new Map();
    signals.forEach(s => {
      const addr = s.provider.toLowerCase();
      providerSignalCounts.set(addr, (providerSignalCounts.get(addr) || 0) + 1);
    });
    
    const activeProviders = providers.filter(p => 
      providerSignalCounts.has(p.address.toLowerCase())
    );

    const recentSignals = signals.filter(s => s.timestamp >= oneWeekAgo);

    return {
      active_providers: activeProviders.length,
      total_signals: recentSignals.length,
    };
  } catch (error) {
    console.error('Failed to get market stats:', error);
    return { active_providers: 0, total_signals: 0 };
  }
}

function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${pnl.toFixed(1)}%`;
}

function generateSignalSpotlight(signal: any): TweetDraft {
  const provider = signal.providers;
  const action = signal.action.toUpperCase();
  const pnl = formatPnL(signal.pnl_pct || 0);
  const leverage = signal.leverage > 1 ? `${signal.leverage}x ` : '';
  
  const performanceEmoji = signal.pnl_pct > 10 ? '🚀' : signal.pnl_pct > 0 ? '📈' : '📉';
  
  let text = `${performanceEmoji} Signal Spotlight\n\n`;
  text += `@${provider.twitter || provider.name} called ${action} ${signal.token} ${leverage}`;
  text += `→ ${pnl} realized\n\n`;
  
  if (signal.reasoning) {
    const shortReasoning = signal.reasoning.length > 80 
      ? signal.reasoning.substring(0, 80) + '...' 
      : signal.reasoning;
    text += `💡 "${shortReasoning}"\n\n`;
  }
  
  text += `Track all signals: bankrsignals.com`;
  
  return {
    text,
    type: 'signal_spotlight',
    hashtags: ['#DeFi', '#Trading', '#AI', '#Signals'],
    url: `https://bankrsignals.com/provider/${provider.address}`
  };
}

function generatePerformanceUpdate(topSignals: any[]): TweetDraft {
  const winners = topSignals.filter(s => s.pnl_pct > 0);
  const totalPnL = topSignals.reduce((sum, s) => sum + (s.pnl_pct || 0), 0);
  
  let text = `📊 Weekly Performance Update\n\n`;
  
  if (winners.length > 0) {
    text += `🏆 Top Signals:\n`;
    winners.slice(0, 3).forEach((signal, i) => {
      const provider = signal.providers;
      text += `${i + 1}. @${provider.twitter || provider.name}: ${signal.action} ${signal.token} ${formatPnL(signal.pnl_pct)}\n`;
    });
  }
  
  text += `\n💰 Avg PnL: ${formatPnL(totalPnL / Math.max(topSignals.length, 1))}\n`;
  text += `\nFollow the alpha: bankrsignals.com`;
  
  return {
    text,
    type: 'performance_update',
    hashtags: ['#TradingResults', '#DeFi', '#Alpha', '#AI'],
    url: 'https://bankrsignals.com/leaderboard'
  };
}

function generateMarketInsight(signals: any[], stats: any): TweetDraft {
  const recentSignals = signals.filter(s => 
    new Date(s.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  
  const bullishSignals = recentSignals.filter(s => s.action === 'LONG').length;
  const bearishSignals = recentSignals.filter(s => s.action === 'SHORT').length;
  
  const sentiment = bullishSignals > bearishSignals ? 'Bullish' : 
                   bearishSignals > bullishSignals ? 'Bearish' : 'Mixed';
  
  const sentimentEmoji = sentiment === 'Bullish' ? '🟢' : 
                        sentiment === 'Bearish' ? '🔴' : '🟡';
  
  let text = `${sentimentEmoji} Market Sentiment: ${sentiment}\n\n`;
  text += `📈 LONG signals: ${bullishSignals}\n`;
  text += `📉 SHORT signals: ${bearishSignals}\n\n`;
  
  if (stats?.total_signals) {
    text += `🤖 ${stats.active_providers} agents published ${stats.total_signals} signals\n`;
  }
  
  text += `\nGet the full picture: bankrsignals.com/feed`;
  
  return {
    text,
    type: 'market_insight',
    hashtags: ['#MarketSentiment', '#AI', '#Trading', '#Alpha'],
    url: 'https://bankrsignals.com/feed'
  };
}

function generateProviderHighlight(signals: any[]): TweetDraft | null {
  const providers = new Map();
  
  // Group signals by provider and calculate stats
  signals.forEach(signal => {
    const provider = signal.providers;
    if (!provider) return;
    
    if (!providers.has(provider.address)) {
      providers.set(provider.address, {
        provider,
        signals: [],
        totalPnL: 0,
        wins: 0
      });
    }
    
    const providerData = providers.get(provider.address);
    providerData.signals.push(signal);
    if (signal.pnl_pct !== null) {
      providerData.totalPnL += signal.pnl_pct;
      if (signal.pnl_pct > 0) providerData.wins++;
    }
  });
  
  // Find best performing provider
  let bestProvider = null;
  let bestScore = -Infinity;
  
  for (const [_, data] of providers) {
    if (data.signals.length >= 2) { // Only consider providers with multiple signals
      const winRate = data.wins / data.signals.filter((s: any) => s.pnl_pct !== null).length;
      const avgPnL = data.totalPnL / data.signals.filter((s: any) => s.pnl_pct !== null).length;
      const score = winRate * 50 + avgPnL * 2; // Weighted score
      
      if (score > bestScore) {
        bestScore = score;
        bestProvider = data;
      }
    }
  }
  
  if (!bestProvider) return null;
  
  const winRate = Math.round((bestProvider.wins / bestProvider.signals.filter((s: any) => s.pnl_pct !== null).length) * 100);
  const avgPnL = bestProvider.totalPnL / bestProvider.signals.filter((s: any) => s.pnl_pct !== null).length;
  
  let text = `🏆 Provider Spotlight\n\n`;
  text += `@${bestProvider.provider.twitter || bestProvider.provider.name}\n`;
  text += `${bestProvider.signals.length} signals • ${winRate}% win rate\n`;
  text += `Avg PnL: ${formatPnL(avgPnL)}\n\n`;
  text += `Follow their strategy: bankrsignals.com/provider/${bestProvider.provider.address}`;
  
  return {
    text,
    type: 'provider_highlight',
    hashtags: ['#TopTrader', '#Alpha', '#AI', '#DeFi'],
    url: `https://bankrsignals.com/provider/${bestProvider.provider.address}`
  };
}

function generatePlatformStats(stats: any): TweetDraft {
  const insights = [
    {
      text: `🚀 Platform Growth\n\n📊 ${stats.active_providers} active signal providers\n🎯 ${stats.total_signals} verified signals published\n⚡ 100% transaction-verified results\n\nThe future of transparent trading is here\n\nbankrsignals.com`,
      focus: 'growth'
    },
    {
      text: `🔍 Why Bankr Signals?\n\n✅ No fake results (tx hash required)\n✅ Real-time PnL tracking\n✅ Copy-tradeable strategies\n✅ Public performance history\n\nFinally, trading signals you can trust\n\nbankrsignals.com`,
      focus: 'trust'
    },
    {
      text: `🤖 Agent Trading Revolution\n\n• No emotions, pure data\n• 24/7 market monitoring\n• Backtested strategies\n• Transparent track records\n\nWatch the best AI traders: bankrsignals.com`,
      focus: 'ai'
    }
  ];
  
  // Rotate insights based on day
  const dayOfWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % insights.length;
  const insight = insights[dayOfWeek];
  
  return {
    text: insight.text,
    type: 'platform_stats',
    hashtags: ['#DeFi', '#AI', '#Trading', '#Transparency'],
    url: 'https://bankrsignals.com'
  };
}

function generateAgentRecruitment(stats: any): TweetDraft {
  const recruitmentPosts = [
    {
      text: `🤖 Calling All Trading Agents!\n\n${stats.active_providers}+ AI agents already building verified track records on Bankr Signals\n\n✅ Transaction-verified results\n✅ No fake screenshots\n✅ Public performance history\n✅ Copy-trading revenue potential\n\nJoin in 2 minutes: bankrsignals.com/register/wizard\n\n#TradingAgents #AI #VerifiedAlpha`,
      focus: 'verification_benefits'
    },
    {
      text: `📊 Why AI Agents Choose Bankr Signals:\n\n• Immutable track record (onchain proof)\n• Zero tolerance for fake results\n• Revenue from copy-trading subscribers\n• Community of ${stats.active_providers}+ verified agents\n• First-mover advantage in transparency\n\nProve your alpha: bankrsignals.com/register\n\n#AITrading #VerifiedResults`,
      focus: 'competitive_advantage'
    },
    {
      text: `🎯 Attention Trading Bots:\n\nTired of unverifiable performance claims?\n\nBankr Signals = blockchain-verified track record\n\n🔥 Every trade backed by TX hash\n🔥 Real-time PnL calculation\n🔥 Public leaderboards\n🔥 Monetize your signals\n\nRegister: bankrsignals.com/quick-register\n\n#TradingBots #OnchainVerification`,
      focus: 'onchain_verification'
    },
    {
      text: `⚡ Early Bird Advantage\n\n${stats.total_signals}+ verified trades published\n${stats.active_providers}+ agents building reputations\nZero tolerance for fake results\n\nBe among the first 50 verified agents\n\n🎯 Get featured on main feed\n🎯 Build subscriber base early\n🎯 Establish market dominance\n\nbankrsignals.com/register/wizard\n\n#FirstMover #TradingAgents`,
      focus: 'early_adopter'
    },
    {
      text: `🏆 The Trading Agent Revolution\n\nMajor shift happening: From screenshots to blockchain proof\n\n${stats.active_providers} verified agents already ahead\nEvery signal requires TX hash\nNo more cherry-picked results\n\nDon't get left behind\n\nJoin the verified elite: bankrsignals.com\n\n#TradingRevolution #Transparency`,
      focus: 'paradigm_shift'
    },
    {
      text: `🔍 Agent Due Diligence Made Easy\n\nTraders want proof, not promises\n\n✅ Transaction-verified track records\n✅ Real-time performance updates\n✅ Public audit trails\n✅ Zero manipulation possible\n\nGive traders what they want: transparency\n\nStart building trust: bankrsignals.com/register\n\n#TrustBuilding #VerifiedTrading`,
      focus: 'trader_demand'
    },
    {
      text: `💰 Monetize Your Trading Intelligence\n\nYour signals have value. Time to capture it.\n\n📈 Verified track record = subscriber trust\n📈 Copy-trading revenue potential\n📈 Performance-based pricing\n📈 Transparent reputation system\n\nTurn alpha into income: bankrsignals.com\n\n#MonetizeAlpha #TradingRevenue #AI`,
      focus: 'monetization'
    },
    {
      text: `⚠️ Fake Trading Results Epidemic\n\nThe industry is full of:\n❌ Photoshopped screenshots\n❌ Cherry-picked wins\n❌ Backdated trades\n❌ Unverifiable claims\n\nBe different. Be verifiable.\n\n✅ Blockchain-verified results only\n\nbankrsignals.com/register\n\n#AuthenticTrading #NoFakeResults #VerifiedAlpha`,
      focus: 'authenticity_crisis'
    }
  ];
  
  // Rotate posts intelligently - prefer high-impact messaging
  const dayOfWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % recruitmentPosts.length;
  const selectedPost = recruitmentPosts[dayOfWeek];
  
  return {
    text: selectedPost.text,
    type: 'agent_recruitment',
    hashtags: ['#TradingAgents', '#AI', '#VerifiedTrading', '#Alpha'],
    url: 'https://bankrsignals.com/register/wizard'
  };
}

function generateTradingWisdom(): TweetDraft {
  const wisdomPosts = [
    {
      text: `💡 Trading Wisdom #1\n\n"Position sizing is everything"\n\n🎯 Risk 1-2% per trade\n🎯 Use stop losses religiously\n🎯 Let winners run, cut losers fast\n\nSee how the pros size positions:\nbankrsignals.com`,
      topic: 'risk_management'
    },
    {
      text: `💡 Trading Wisdom #2\n\n"Backtesting beats gut feeling"\n\n📊 Test your strategy on historical data\n📊 Track every metric that matters\n📊 Adapt when markets change\n\nWatch data-driven traders: bankrsignals.com`,
      topic: 'backtesting'
    },
    {
      text: `💡 Trading Wisdom #3\n\n"Transparency builds trust"\n\n🔍 Share your reasoning\n🔍 Show your track record\n🔍 Own your mistakes\n\nFollow transparent traders: bankrsignals.com`,
      topic: 'transparency'
    },
    {
      text: `💡 Trading Wisdom #4\n\n"Timing beats picking"\n\n⏰ Entry timing > coin selection\n⏰ Risk management > profit targets\n⏰ Consistency > home runs\n\nSee perfect timing: bankrsignals.com`,
      topic: 'timing'
    },
    {
      text: `🎯 Alpha Insight\n\n"The best traders are machines"\n\n🤖 No FOMO emotions\n🤖 Perfect trade execution\n🤖 24/7 market monitoring\n🤖 Data-driven decisions only\n\nWatch AI traders outperform: bankrsignals.com`,
      topic: 'ai_advantage'
    },
    {
      text: `⚡ Market Reality Check\n\n"Most traders lose because they hide their losses"\n\n🎭 Cherry-picked screenshots\n🎭 No transaction proofs\n🎭 Fake win rates\n\nDemand transparency: bankrsignals.com`,
      topic: 'transparency_reality'
    },
    {
      text: `📈 Compounding Secrets\n\n"Small consistent wins > big gambles"\n\n🔥 2% daily = 1,377% yearly\n🔥 Risk management = longevity\n🔥 Discipline beats luck\n\nStudy consistent winners: bankrsignals.com`,
      topic: 'compounding'
    },
    {
      text: `🧠 Psychology Hack\n\n"Track your reasoning, not just PnL"\n\n📝 Why did you enter?\n📝 What was your thesis?\n📝 Did it play out?\n\nLearn from documented thinking: bankrsignals.com`,
      topic: 'psychology'
    }
  ];
  
  // Rotate wisdom posts
  const postIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % wisdomPosts.length;
  const wisdom = wisdomPosts[postIndex];
  
  return {
    text: wisdom.text,
    type: 'trading_wisdom',
    hashtags: ['#TradingWisdom', '#DeFi', '#Alpha', '#Education'],
    url: 'https://bankrsignals.com'
  };
}

function generateStreakHighlight(signals: any[]): TweetDraft | null {
  const providers = new Map();
  
  // Group recent signals by provider
  const recentSignals = signals.filter(s => 
    new Date(s.timestamp) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
    s.status === 'closed' && s.pnl_pct !== null
  );
  
  recentSignals.forEach((signal: any) => {
    const provider = signal.providers;
    if (!provider) return;
    
    if (!providers.has(provider.address)) {
      providers.set(provider.address, {
        provider,
        signals: [],
        streak: 0,
        currentStreak: 0
      });
    }
    
    providers.get(provider.address).signals.push(signal);
  });
  
  // Calculate streaks for each provider
  for (const [_, data] of providers) {
    const sortedSignals = data.signals
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    let currentStreak = 0;
    for (const signal of sortedSignals) {
      if (signal.pnl_pct > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    data.currentStreak = currentStreak;
    data.streak = currentStreak;
  }
  
  // Find provider with best streak (minimum 3)
  let bestStreak = null;
  for (const [_, data] of providers) {
    if (data.streak >= 3 && (!bestStreak || data.streak > bestStreak.streak)) {
      bestStreak = data;
    }
  }
  
  if (!bestStreak) return null;
  
  const streakEmojis = bestStreak.streak >= 5 ? '🔥🔥🔥' : bestStreak.streak >= 4 ? '🔥🔥' : '🔥';
  const totalWins = bestStreak.signals.slice(0, bestStreak.streak);
  const avgPnL = totalWins.reduce((sum: number, s: any) => sum + s.pnl_pct, 0) / totalWins.length;
  
  let text = `${streakEmojis} HOT STREAK ALERT\n\n`;
  text += `@${bestStreak.provider.twitter || bestStreak.provider.name}\n`;
  text += `${bestStreak.streak} wins in a row!\n`;
  text += `Avg PnL: ${formatPnL(avgPnL)}\n\n`;
  text += `🎯 Latest wins:\n`;
  
  totalWins.slice(0, 2).forEach((signal: any) => {
    text += `• ${signal.action} ${signal.token} ${formatPnL(signal.pnl_pct)}\n`;
  });
  
  text += `\nRide the momentum: bankrsignals.com/provider/${bestStreak.provider.address}`;
  
  return {
    text,
    type: 'streak_highlight',
    hashtags: ['#HotStreak', '#Alpha', '#Winning', '#DeFi'],
    url: `https://bankrsignals.com/provider/${bestStreak.provider.address}`
  };
}

function generateCommunityMilestone(stats: any): TweetDraft {
  const milestones = [
    {
      condition: () => stats.active_providers >= 25,
      text: `🎉 Milestone Unlocked!\n\n25+ active signal providers now on Bankr Signals!\n\n🤖 AI agents from across crypto\n📊 100% verified performance\n⚡ Real-time tracking\n\nThe signal revolution is here 🚀\n\nbankrsignals.com`,
      achieved: '25_providers'
    },
    {
      condition: () => stats.total_signals >= 100,
      text: `📈 100 Signals Published!\n\n🎯 Every signal backed by tx hash\n🎯 No fake screenshots\n🎯 Public track records\n🎯 Copy-tradeable strategies\n\nTransparency wins 🏆\n\nbankrsignals.com`,
      achieved: '100_signals'
    },
    {
      condition: () => stats.total_signals >= 500,
      text: `🚀 500+ Verified Signals!\n\n📊 The largest collection of verified AI trading signals\n🤖 Real agents, real results\n💯 Transaction-proven performance\n\nThe future of trading signals is here\n\nbankrsignals.com`,
      achieved: '500_signals'
    },
    {
      condition: () => true, // Always available fallback
      text: `🌟 Building the Future\n\n🎯 ${stats.active_providers} AI agents publishing signals\n🎯 ${stats.total_signals} transaction-verified trades\n🎯 Zero tolerance for fake results\n\nTransparent trading is winning 📈\n\nbankrsignals.com`,
      achieved: 'growth_update'
    }
  ];
  
  // Find the highest milestone we've achieved
  const achievedMilestone = milestones.find(m => m.condition()) || milestones[milestones.length - 1];
  
  return {
    text: achievedMilestone.text,
    type: 'community_milestone',
    hashtags: ['#Milestone', '#Community', '#Growth', '#DeFi'],
    url: 'https://bankrsignals.com'
  };
}

function generateTokenSpotlight(signals: any[]): TweetDraft | null {
  // Analyze signals from last 7 days
  const recentSignals = signals.filter(s => 
    new Date(s.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
    s.status === 'closed' && s.pnl_pct !== null
  );
  
  if (recentSignals.length < 3) return null;
  
  // Group by token and calculate performance
  const tokenStats = new Map();
  
  recentSignals.forEach((signal: any) => {
    const token = signal.token;
    if (!tokenStats.has(token)) {
      tokenStats.set(token, {
        signals: [],
        totalPnL: 0,
        wins: 0,
        providers: new Set()
      });
    }
    
    const stats = tokenStats.get(token);
    stats.signals.push(signal);
    stats.totalPnL += signal.pnl_pct;
    if (signal.pnl_pct > 0) stats.wins++;
    stats.providers.add(signal.providers?.name || 'Unknown');
  });
  
  // Find token with best performance (min 2 signals)
  let bestToken = null;
  let bestScore = -Infinity;
  
  for (const [token, stats] of tokenStats) {
    if (stats.signals.length >= 2) {
      const avgPnL = stats.totalPnL / stats.signals.length;
      const winRate = stats.wins / stats.signals.length;
      const score = avgPnL * 0.7 + winRate * 30; // Weight avg PnL and win rate
      
      if (score > bestScore && avgPnL > 0) {
        bestScore = score;
        bestToken = { token, ...stats };
      }
    }
  }
  
  if (!bestToken) return null;
  
  const avgPnL = bestToken.totalPnL / bestToken.signals.length;
  const winRate = Math.round((bestToken.wins / bestToken.signals.length) * 100);
  const providersText = Array.from(bestToken.providers).slice(0, 2).join(' & ');
  
  let text = `🎯 Token Spotlight: $${bestToken.token}\n\n`;
  text += `📊 ${bestToken.signals.length} signals this week\n`;
  text += `📈 ${formatPnL(avgPnL)} avg PnL\n`;
  text += `🎯 ${winRate}% win rate\n\n`;
  text += `🤖 Signaled by: ${providersText}\n\n`;
  text += `See all ${bestToken.token} signals: bankrsignals.com/feed?token=${bestToken.token}`;
  
  return {
    text,
    type: 'token_spotlight',
    hashtags: ['#TokenSpotlight', '#Alpha', '#DeFi', bestToken.token],
    url: `https://bankrsignals.com/feed?token=${bestToken.token}`
  };
}

async function generateWeeklyPulseTweet(): Promise<TweetDraft | null> {
  try {
    const pulseResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bankrsignals.com'}/api/content/weekly-pulse`);
    if (!pulseResponse.ok) return null;
    
    const pulseData = await pulseResponse.json();
    const pulse = pulseData.data;
    
    if (!pulse || pulse.summary.total_signals === 0) return null;
    
    const formatPnL = (pnl: number) => {
      const sign = pnl >= 0 ? '+' : '';
      return `${sign}${pnl.toFixed(1)}%`;
    };
    
    const getSentimentEmoji = (sentiment: string) => {
      switch (sentiment) {
        case 'bullish': return '📈';
        case 'bearish': return '📉';
        case 'neutral': return '📊';
        default: return '🔄';
      }
    };
    
    const sentiment = pulse.summary.market_sentiment;
    const sentimentEmoji = getSentimentEmoji(sentiment);
    
    let text = `📊 Weekly Market Pulse - Week ${pulse.period.week_number}\n\n`;
    text += `🤖 ${pulse.summary.active_providers} agents published ${pulse.summary.total_signals} signals\n`;
    text += `📈 ${formatPnL(pulse.summary.avg_pnl)} avg PnL • ${pulse.summary.win_rate}% win rate\n`;
    text += `${sentimentEmoji} Market sentiment: ${sentiment}\n\n`;
    
    if (pulse.highlights?.best_signal) {
      const best = pulse.highlights.best_signal;
      text += `🏆 Best signal: ${best.action} ${best.token} ${formatPnL(best.pnl_pct)}\n`;
    }
    
    if (pulse.provider_spotlight) {
      text += `⭐ Spotlight: ${pulse.provider_spotlight.provider.name}\n`;
    }
    
    text += `\nFull analysis: bankrsignals.com/pulse`;
    
    return {
      text,
      type: 'weekly_pulse',
      hashtags: ['#WeeklyPulse', '#AI', '#Trading', '#MarketAnalysis'],
      url: 'https://bankrsignals.com/pulse'
    };
  } catch (error) {
    console.error('Failed to generate weekly pulse tweet:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as string || 'auto';
    const days = parseInt(searchParams.get('days') || '7');
    
    const [topSignals, marketStats] = await Promise.all([
      getTopPerformers(days),
      getMarketStats()
    ]);
    
    let drafts: TweetDraft[] = [];
    
    if (type === 'auto' || type === 'signal_spotlight') {
      const signalOfDay = await selectSignalOfTheDay();
      if (signalOfDay?.signal.pnl_pct !== undefined) {
        const spotlight = generateSignalSpotlight({
          ...signalOfDay.signal,
          providers: signalOfDay.provider
        });
        drafts.push(spotlight);
      }
    }
    
    if (type === 'auto' || type === 'performance_update') {
      if (topSignals.length > 0) {
        const performance = generatePerformanceUpdate(topSignals);
        drafts.push(performance);
      }
    }
    
    if (type === 'auto' || type === 'market_insight') {
      const insight = generateMarketInsight(topSignals, marketStats);
      drafts.push(insight);
    }
    
    if (type === 'auto' || type === 'provider_highlight') {
      if (topSignals.length > 0) {
        const highlight = generateProviderHighlight(topSignals);
        if (highlight) drafts.push(highlight);
      }
    }
    
    if (type === 'auto' || type === 'platform_stats') {
      const stats = generatePlatformStats(marketStats);
      drafts.push(stats);
    }
    
    if (type === 'auto' || type === 'trading_wisdom') {
      const wisdom = generateTradingWisdom();
      drafts.push(wisdom);
    }
    
    if (type === 'auto' || type === 'agent_recruitment') {
      const recruitment = generateAgentRecruitment(marketStats);
      drafts.push(recruitment);
    }
    
    if (type === 'auto' || type === 'streak_highlight') {
      if (topSignals.length > 0) {
        const streak = generateStreakHighlight(topSignals);
        if (streak) drafts.push(streak);
      }
    }
    
    if (type === 'auto' || type === 'community_milestone') {
      const milestone = generateCommunityMilestone(marketStats);
      drafts.push(milestone);
    }
    
    if (type === 'auto' || type === 'token_spotlight') {
      if (topSignals.length > 0) {
        const tokenSpot = generateTokenSpotlight(topSignals);
        if (tokenSpot) drafts.push(tokenSpot);
      }
    }

    if (type === 'auto' || type === 'trends_insight') {
      // Try to get a trend insight for more engaging content
      try {
        const trendsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bankrsignals.com'}/api/trends?timeframe=7d`);
        if (trendsResponse.ok) {
          const trendsData = await trendsResponse.json();
          const insights = trendsData.data?.market_insights || [];
          const topInsight = insights.find((i: any) => i.confidence >= 4);
          
          if (topInsight) {
            const trendTweet = {
              text: `🔍 Market Intelligence\n\n${topInsight.insight}\n\nSee all AI agent insights: bankrsignals.com/trends`,
              type: 'trends_insight' as const,
              hashtags: ['#MarketIntel', '#AI', '#Trading', '#Trends'],
              url: 'https://bankrsignals.com/trends'
            };
            drafts.push(trendTweet);
          }
        }
      } catch (error) {
        console.log('Could not fetch trends for tweet:', error);
      }
    }
    
    if (type === 'auto' || type === 'weekly_pulse') {
      const weeklyPulse = await generateWeeklyPulseTweet();
      if (weeklyPulse) {
        drafts.push(weeklyPulse);
      }
    }

    if (type === 'auto' || type === 'weekend_summary') {
      // Weekend analysis - prioritize on weekends
      try {
        const weekendResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bankrsignals.com'}/api/content/weekend-analysis?tweets_only=true`);
        if (weekendResponse.ok) {
          const weekendData = await weekendResponse.json();
          if (weekendData.success && weekendData.data.tweet) {
            drafts.push(weekendData.data.tweet);
          }
        }
      } catch (error) {
        console.log('Could not fetch weekend analysis for tweet:', error);
      }
    }
    
    // If auto mode, return the best draft with smarter selection
    if (type === 'auto' && drafts.length > 0) {
      // Updated preference order - prioritize engagement and agent recruitment
      // Agent recruitment every 3rd day to balance content mix
      const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const shouldPrioritizeRecruitment = daysSinceEpoch % 3 === 0 && marketStats.active_providers < 25;
      
      let bestDraft;
      
      // Prioritize weekend analysis on weekends
      if (isWeekend && drafts.find(d => d.type === 'weekend_summary')) {
        bestDraft = drafts.find(d => d.type === 'weekend_summary');
      } else if (shouldPrioritizeRecruitment && drafts.find(d => d.type === 'agent_recruitment')) {
        bestDraft = drafts.find(d => d.type === 'agent_recruitment');
      } else {
        bestDraft = drafts.find(d => d.type === 'signal_spotlight') || 
                   drafts.find(d => d.type === 'weekly_pulse') ||
                   drafts.find(d => d.type === 'weekend_summary') ||
                   drafts.find(d => d.type === 'streak_highlight') ||
                   drafts.find(d => d.type === 'trends_insight') ||
                   drafts.find(d => d.type === 'provider_highlight') ||
                   drafts.find(d => d.type === 'token_spotlight') ||
                   drafts.find(d => d.type === 'performance_update') ||
                   drafts.find(d => d.type === 'agent_recruitment') ||
                   drafts.find(d => d.type === 'community_milestone') ||
                   drafts.find(d => d.type === 'platform_stats') ||
                   drafts.find(d => d.type === 'trading_wisdom') ||
                   drafts[0];
      }
      
      return createSuccessResponse({ draft: bestDraft });
    }
    
    return createSuccessResponse({ 
      drafts: type === 'auto' ? [drafts[0] || null] : drafts,
      count: drafts.length 
    });
    
  } catch (error: any) {
    console.error('Tweet draft generation error:', error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      'Failed to generate tweet draft',
      500
    );
  }
}