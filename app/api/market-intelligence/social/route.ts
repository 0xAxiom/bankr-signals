import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MarketSignal {
  id: string
  provider: string
  timestamp: string
  action: 'LONG' | 'SHORT' | 'BUY' | 'SELL'
  token: string
  entryPrice: number
  leverage: number | null
  confidence: number
  reasoning: string
  status: 'open' | 'closed'
  pnlPct: number | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') || 'twitter' // twitter, farcaster, etc
    const days = parseInt(searchParams.get('days') || '7')

    // Get recent signals
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 })
    }

    const content = generateSocialContent(signals as MarketSignal[], platform, days)

    return NextResponse.json({
      success: true,
      platform,
      period: `${days} days`,
      timestamp: new Date().toISOString(),
      content
    })

  } catch (error) {
    console.error('Social content generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateSocialContent(signals: MarketSignal[], platform: string, days: number) {
  if (signals.length === 0) {
    return {
      type: 'no_data',
      text: `🤖 Market Intelligence Update\n\nNo verified trading signals detected in the last ${days} days.\n\n📊 View live dashboard: bankrsignals.com/market-intelligence`,
      hashtags: ['#DeFi', '#TradingSignals', '#Base']
    }
  }

  // Calculate key metrics
  const totalSignals = signals.length
  const uniqueProviders = new Set(signals.map(s => s.provider)).size
  const bullishSignals = signals.filter(s => ['LONG', 'BUY'].includes(s.action)).length
  const bearishSignals = signals.filter(s => ['SHORT', 'SELL'].includes(s.action)).length
  const sentiment = bullishSignals > bearishSignals ? 'Bullish' : 
                   bearishSignals > bullishSignals ? 'Bearish' : 'Neutral'
  const sentimentRatio = Math.round(bullishSignals / (bullishSignals + bearishSignals) * 100)

  // Most active tokens
  const tokenCounts = signals.reduce((acc, s) => {
    acc[s.token] = (acc[s.token] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topTokens = Object.entries(tokenCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([token]) => token)

  // Performance analysis
  const closedSignals = signals.filter(s => s.status === 'closed' && s.pnlPct !== null)
  const winRate = closedSignals.length > 0 ? 
    Math.round(closedSignals.filter(s => (s.pnlPct || 0) > 0).length / closedSignals.length * 100) : null

  // High confidence trades
  const highConfidenceSignals = signals.filter(s => s.confidence > 0.9).length
  const avgConfidence = Math.round(
    signals.filter(s => s.confidence).reduce((sum, s) => sum + s.confidence, 0) / 
    signals.filter(s => s.confidence).length * 100
  )

  // Generate content based on platform
  if (platform === 'twitter') {
    return generateTwitterContent({
      totalSignals,
      uniqueProviders,
      sentiment,
      sentimentRatio,
      topTokens,
      winRate,
      highConfidenceSignals,
      avgConfidence,
      days,
      closedSignals: closedSignals.length
    })
  } else if (platform === 'farcaster') {
    return generateFarcasterContent({
      totalSignals,
      uniqueProviders,
      sentiment,
      sentimentRatio,
      topTokens,
      winRate,
      days
    })
  }

  return generateGenericContent({
    totalSignals,
    uniqueProviders,
    sentiment,
    sentimentRatio,
    topTokens,
    winRate,
    days
  })
}

function generateTwitterContent(data: any) {
  const { totalSignals, uniqueProviders, sentiment, sentimentRatio, topTokens, winRate, highConfidenceSignals, avgConfidence, days, closedSignals } = data

  // Choose thread type based on data
  let threadType = 'market_overview'
  if (winRate !== null && winRate > 75) threadType = 'performance_spotlight'
  else if (sentiment !== 'Neutral' && sentimentRatio > 80) threadType = 'sentiment_analysis'
  else if (highConfidenceSignals >= 5) threadType = 'high_conviction'

  const threads = {
    market_overview: {
      type: 'market_overview',
      tweets: [
        `🧠 Market Intelligence Report (${days}d)\n\n${totalSignals} verified signals from ${uniqueProviders} agents\n\n${getSentimentEmoji(sentiment)} ${sentiment} sentiment (${sentimentRatio}%)\n🎯 Most active: ${topTokens.slice(0, 2).join(', ')}\n${winRate ? `📊 ${winRate}% win rate` : '⏳ Positions tracking'}\n\n🔗 bankrsignals.com/market-intelligence`,
        
        `📊 Signal Breakdown:\n\n• ${totalSignals} total trades verified onchain\n• ${uniqueProviders} active agents publishing\n• ${avgConfidence}% average confidence\n${highConfidenceSignals > 0 ? `• ${highConfidenceSignals} high-conviction trades (>90%)\n` : ''}• Transaction hashes = unbreakable proof\n\n${sentiment} bias shows in ${sentimentRatio}% of signals 📈`,
        
        `🔍 What This Means:\n\n${generateInsights(data)}\n\n💡 All signals are backed by Base transaction hashes - no fake track records possible.\n\n📈 See live data: bankrsignals.com`
      ],
      hashtags: ['#DeFi', '#TradingSignals', '#Base', '#OnchainData', '#MarketIntelligence']
    },

    performance_spotlight: {
      type: 'performance_spotlight',
      tweets: [
        `🚀 Performance Alert!\n\n${winRate}% win rate across ${closedSignals} verified trades (${days}d)\n\n✅ ${sentiment} sentiment driving results\n🎯 Top assets: ${topTokens.slice(0, 2).join(', ')}\n🔗 ${totalSignals} signals from ${uniqueProviders} agents\n\n📊 Full breakdown: bankrsignals.com/market-intelligence`,
        
        `💪 Why These Numbers Matter:\n\n• Every trade backed by transaction hash\n• ${avgConfidence}% average confidence\n• ${uniqueProviders} independent agents\n• Real money, real results\n\n🚫 No paper trading\n🚫 No fake claims\n✅ Pure onchain verification`,
        
        `🎯 Want to follow top performers?\n\n• Copy trading simulator live\n• REST API for automation  \n• Follow system for favorites\n• Email digests available\n\n🔥 Start here: bankrsignals.com/copy-trading`
      ],
      hashtags: ['#Trading', '#Performance', '#CopyTrading', '#DeFi', '#Base']
    },

    sentiment_analysis: {
      type: 'sentiment_analysis',
      tweets: [
        `${getSentimentEmoji(sentiment)} ${sentiment.toUpperCase()} SIGNAL DETECTED\n\n${sentimentRatio}% of verified trades show ${sentiment.toLowerCase()} bias (${days}d)\n\n📊 ${totalSignals} signals analyzed\n🏦 ${uniqueProviders} agents publishing\n🎯 Focus: ${topTokens.slice(0, 2).join(', ')}\n\n⚡ Live intel: bankrsignals.com/market-intelligence`,
        
        `📈 ${sentiment} Momentum Drivers:\n\n${generateSentimentAnalysis(sentiment, data)}\n\n🔍 Remember: This is real trading data, not sentiment surveys. Agents putting money where their algorithms are.`,
        
        `🤖 Why Agent Signals Matter:\n\n• No emotional bias\n• Transaction-verified positions\n• Algorithmic decision making\n• 24/7 market monitoring\n\n📊 Track the robots: bankrsignals.com`
      ],
      hashtags: ['#MarketSentiment', sentiment === 'Bullish' ? '#Bullish' : '#Bearish', '#TradingBots', '#DeFi']
    },

    high_conviction: {
      type: 'high_conviction',
      tweets: [
        `🎯 HIGH CONVICTION ALERT\n\n${highConfidenceSignals} trades published with >90% confidence (${days}d)\n\n🧠 ${avgConfidence}% average conviction\n${getSentimentEmoji(sentiment)} ${sentiment} bias in ${sentimentRatio}% of signals\n🏆 Top assets: ${topTokens.slice(0, 2).join(', ')}\n\n⚡ bankrsignals.com/market-intelligence`,
        
        `💡 When agents trade with >90% confidence:\n\n• Multiple technical confirmations\n• Strong fundamental thesis\n• Risk/reward math checks out\n• Algorithm conviction peaks\n\n📊 These ${highConfidenceSignals} trades deserve attention.`,
        
        `🔥 Follow High-Conviction Traders:\n\n• Filter by confidence level\n• Copy trading simulations\n• Performance tracking\n• API integration ready\n\n🎯 Start: bankrsignals.com/copy-trading`
      ],
      hashtags: ['#HighConviction', '#Trading', '#Algorithms', '#DeFi']
    }
  }

  return threads[threadType] || threads.market_overview
}

function generateFarcasterContent(data: any) {
  const { totalSignals, uniqueProviders, sentiment, sentimentRatio, topTokens, winRate, days } = data

  return {
    type: 'market_update',
    text: `🧠 ${days}d Market Intel\n\n${totalSignals} signals, ${uniqueProviders} agents\n${getSentimentEmoji(sentiment)} ${sentiment} (${sentimentRatio}%)\n🎯 ${topTokens[0]} leading${winRate ? `\n📊 ${winRate}% win rate` : ''}\n\nbankrsignals.com/market-intelligence`,
    hashtags: []
  }
}

function generateGenericContent(data: any) {
  const { totalSignals, uniqueProviders, sentiment, sentimentRatio, topTokens, winRate, days } = data

  return {
    type: 'generic_update',
    text: `Market Intelligence Update (${days} days)\n\n${totalSignals} verified trading signals from ${uniqueProviders} autonomous agents show ${sentiment.toLowerCase()} sentiment (${sentimentRatio}%). Most active assets: ${topTokens.join(', ')}.${winRate ? ` Performance: ${winRate}% win rate.` : ''}\n\nView full analysis: bankrsignals.com/market-intelligence`,
    hashtags: ['TradingSignals', 'DeFi', 'MarketAnalysis']
  }
}

function getSentimentEmoji(sentiment: string): string {
  switch (sentiment) {
    case 'Bullish': return '📈'
    case 'Bearish': return '📉'
    default: return '⚖️'
  }
}

function generateInsights(data: any): string {
  const { sentiment, sentimentRatio, topTokens, uniqueProviders } = data
  
  const insights = []
  
  if (sentimentRatio > 75) {
    insights.push(`Strong ${sentiment.toLowerCase()} consensus emerging`)
  }
  
  if (topTokens.length > 0) {
    insights.push(`${topTokens[0]} capturing most agent attention`)
  }
  
  if (uniqueProviders > 5) {
    insights.push(`${uniqueProviders} independent agents = diverse strategies`)
  } else {
    insights.push(`Small agent pool = concentrated expertise`)
  }
  
  return insights.join('\n• ')
}

function generateSentimentAnalysis(sentiment: string, data: any): string {
  const { topTokens } = data
  
  if (sentiment === 'Bullish') {
    return `• Algorithms seeing upside in ${topTokens[0]}\n• Technical setups aligning bullish\n• Risk/reward favoring long positions\n• Multiple agents converging on buys`
  } else {
    return `• Bearish technical confirmations\n• ${topTokens[0]} showing weakness signals\n• Agents positioning for downside\n• Short setups getting validated`
  }
}