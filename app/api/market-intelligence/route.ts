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
    const daysBack = parseInt(searchParams.get('days') || '7')
    const format = searchParams.get('format') || 'json' // json or markdown

    // Get signals from the last N days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 })
    }

    const analysis = generateMarketIntelligence(signals as MarketSignal[], daysBack)

    if (format === 'markdown') {
      return new NextResponse(analysis.markdown, {
        headers: { 'Content-Type': 'text/markdown' }
      })
    }

    return NextResponse.json({
      success: true,
      period: `Last ${daysBack} days`,
      timestamp: new Date().toISOString(),
      data: analysis
    })

  } catch (error) {
    console.error('Market intelligence error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateMarketIntelligence(signals: MarketSignal[], days: number) {
  if (signals.length === 0) {
    return {
      summary: 'No trading signals available for analysis.',
      markdown: '# Market Intelligence Report\n\nNo trading signals available for the specified period.',
      insights: [],
      metrics: {}
    }
  }

  // Basic metrics
  const totalSignals = signals.length
  const uniqueProviders = new Set(signals.map(s => s.provider)).size
  const tokens = [...new Set(signals.map(s => s.token))]
  
  // Action distribution
  const actionCounts = signals.reduce((acc, s) => {
    acc[s.action] = (acc[s.action] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Sentiment analysis (LONG/BUY vs SHORT/SELL)
  const bullishSignals = signals.filter(s => ['LONG', 'BUY'].includes(s.action)).length
  const bearishSignals = signals.filter(s => ['SHORT', 'SELL'].includes(s.action)).length
  const sentiment = bullishSignals > bearishSignals ? 'Bullish' : 
                   bearishSignals > bullishSignals ? 'Bearish' : 'Neutral'
  const sentimentRatio = bullishSignals / (bullishSignals + bearishSignals) * 100

  // Most traded tokens
  const tokenCounts = signals.reduce((acc, s) => {
    acc[s.token] = (acc[s.token] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topTokens = Object.entries(tokenCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([token, count]) => ({ token, count }))

  // Confidence analysis
  const avgConfidence = signals
    .filter(s => s.confidence)
    .reduce((sum, s) => sum + s.confidence, 0) / signals.filter(s => s.confidence).length

  // Performance analysis (closed positions only)
  const closedSignals = signals.filter(s => s.status === 'closed' && s.pnlPct !== null)
  const totalPnL = closedSignals.reduce((sum, s) => sum + (s.pnlPct || 0), 0)
  const winRate = closedSignals.length > 0 ? 
    (closedSignals.filter(s => (s.pnlPct || 0) > 0).length / closedSignals.length * 100) : 0
  const avgPnL = closedSignals.length > 0 ? totalPnL / closedSignals.length : 0

  // Recent momentum (last 48h vs prior period)
  const recent48h = signals.filter(s => {
    const signalDate = new Date(s.timestamp)
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 48)
    return signalDate >= cutoff
  })

  // Generate insights
  const insights = []
  
  if (sentiment !== 'Neutral') {
    insights.push(`**${sentiment} Sentiment Dominates**: ${sentimentRatio.toFixed(1)}% of signals are ${sentiment.toLowerCase()}`)
  }

  if (topTokens.length > 0) {
    const topToken = topTokens[0]
    insights.push(`**${topToken.token} Most Active**: ${topToken.count} signals (${(topToken.count/totalSignals*100).toFixed(1)}% of volume)`)
  }

  if (avgConfidence > 0.8) {
    insights.push(`**High Conviction Trading**: Average confidence ${(avgConfidence*100).toFixed(1)}%`)
  } else if (avgConfidence < 0.6) {
    insights.push(`**Cautious Market Approach**: Average confidence ${(avgConfidence*100).toFixed(1)}%`)
  }

  if (closedSignals.length >= 5) {
    if (winRate > 70) {
      insights.push(`**Strong Performance**: ${winRate.toFixed(1)}% win rate across ${closedSignals.length} closed positions`)
    } else if (winRate < 40) {
      insights.push(`**Challenging Conditions**: ${winRate.toFixed(1)}% win rate suggests difficult market`)
    }
  }

  if (recent48h.length >= totalSignals * 0.6) {
    insights.push(`**Increased Activity**: ${recent48h.length} signals in last 48h (${(recent48h.length/totalSignals*100).toFixed(1)}% of total)`)
  }

  // Detect patterns in reasoning
  const reasoningPatterns = analyzeReasoningPatterns(signals)
  insights.push(...reasoningPatterns)

  // Generate markdown report
  const markdown = generateMarkdownReport({
    period: `${days} days`,
    totalSignals,
    uniqueProviders,
    sentiment,
    sentimentRatio,
    topTokens,
    avgConfidence,
    winRate,
    avgPnL,
    closedSignals: closedSignals.length,
    insights
  })

  return {
    summary: `${totalSignals} signals from ${uniqueProviders} providers. ${sentiment} sentiment (${sentimentRatio.toFixed(1)}%). ${closedSignals.length > 0 ? `${winRate.toFixed(1)}% win rate` : 'No closed positions'}.`,
    period: `Last ${days} days`,
    metrics: {
      totalSignals,
      uniqueProviders,
      topTokens,
      sentiment,
      sentimentRatio: Math.round(sentimentRatio),
      avgConfidence: Math.round(avgConfidence * 100),
      performance: {
        closedPositions: closedSignals.length,
        winRate: Math.round(winRate),
        avgPnL: Math.round(avgPnL * 100) / 100
      }
    },
    insights,
    markdown,
    actionDistribution: actionCounts
  }
}

function analyzeReasoningPatterns(signals: MarketSignal[]): string[] {
  const patterns = []
  const reasonings = signals.map(s => s.reasoning.toLowerCase())

  // Technical analysis patterns
  const technicalTerms = ['rsi', 'macd', 'ema', 'bollinger', 'momentum']
  const technicalCount = reasonings.filter(r => 
    technicalTerms.some(term => r.includes(term))
  ).length

  if (technicalCount > signals.length * 0.6) {
    patterns.push(`**Technical Analysis Focus**: ${technicalCount} signals use technical indicators`)
  }

  // Market condition patterns
  const fearGreedMentions = reasonings.filter(r => r.includes('fear')).length
  if (fearGreedMentions > 0) {
    patterns.push(`**Fear/Greed Recognition**: ${fearGreedMentions} signals mention market psychology`)
  }

  // Support/resistance patterns
  const supportMentions = reasonings.filter(r => 
    r.includes('support') || r.includes('resistance')
  ).length
  if (supportMentions > signals.length * 0.3) {
    patterns.push(`**Key Level Trading**: ${supportMentions} signals reference support/resistance`)
  }

  return patterns
}

function generateMarkdownReport(data: any): string {
  return `# Market Intelligence Report
*Generated ${new Date().toLocaleDateString()} • Period: ${data.period}*

## Executive Summary
${data.totalSignals} trading signals from ${data.uniqueProviders} active providers showing **${data.sentiment}** market sentiment.

## Key Metrics
- **Signal Volume**: ${data.totalSignals} total signals
- **Market Sentiment**: ${data.sentiment} (${data.sentimentRatio.toFixed(1)}% ${data.sentiment.toLowerCase()})
- **Average Confidence**: ${(data.avgConfidence*100).toFixed(1)}%
- **Performance**: ${data.winRate.toFixed(1)}% win rate across ${data.closedSignals} closed positions

## Most Active Assets
${data.topTokens.map((t: any, i: number) => 
  `${i+1}. **${t.token}**: ${t.count} signals`
).join('\n')}

## Key Insights
${data.insights.map((insight: string) => `• ${insight}`).join('\n')}

## Trading Activity Pattern
Current market shows ${data.sentiment.toLowerCase()} bias with ${data.uniqueProviders} providers actively publishing verified signals. ${data.closedSignals > 0 ? `Performance tracking shows ${data.winRate.toFixed(1)}% win rate.` : 'Performance data pending position closures.'}

---
*View live data at [bankrsignals.com](https://bankrsignals.com)*`
}