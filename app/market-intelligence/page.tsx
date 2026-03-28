'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Activity, Target, Share, Download } from 'lucide-react'

interface MarketIntelligenceData {
  summary: string
  period: string
  metrics: {
    totalSignals: number
    uniqueProviders: number
    topTokens: Array<{ token: string; count: number }>
    sentiment: string
    sentimentRatio: number
    avgConfidence: number
    performance: {
      closedPositions: number
      winRate: number
      avgPnL: number
    }
  }
  insights: string[]
  markdown: string
  actionDistribution: Record<string, number>
}

export default function MarketIntelligencePage() {
  const [data, setData] = useState<MarketIntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('7')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchIntelligence()
  }, [selectedPeriod])

  const fetchIntelligence = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/market-intelligence?days=${selectedPeriod}`)
      const result = await response.json()
      setData(result.data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch market intelligence:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share && data) {
      navigator.share({
        title: 'Market Intelligence Report',
        text: data.summary,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(`${window.location.href}\n\n${data?.summary}`)
    }
  }

  const downloadReport = async () => {
    if (!data) return
    
    try {
      const response = await fetch(`/api/market-intelligence?days=${selectedPeriod}&format=markdown`)
      const markdown = await response.text()
      
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `market-intelligence-${selectedPeriod}d-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Market Intelligence Report</h1>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Market Intelligence Report</h1>
          <p className="text-gray-600">Failed to load market intelligence data.</p>
          <Button onClick={fetchIntelligence} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const getSentimentIcon = (sentiment: string) => {
    return sentiment === 'Bullish' ? (
      <TrendingUp className="w-5 h-5 text-green-600" />
    ) : sentiment === 'Bearish' ? (
      <TrendingDown className="w-5 h-5 text-red-600" />
    ) : (
      <Activity className="w-5 h-5 text-gray-600" />
    )
  }

  const getSentimentColor = (sentiment: string) => {
    return sentiment === 'Bullish' ? 'text-green-600 bg-green-50' :
           sentiment === 'Bearish' ? 'text-red-600 bg-red-50' :
           'text-gray-600 bg-gray-50'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Market Intelligence Report</h1>
          <p className="text-gray-600">{data.summary}</p>
          
          <div className="flex items-center justify-center gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            
            <Button variant="outline" size="sm" onClick={downloadReport}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
          
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.metrics.totalSignals}</div>
              <p className="text-xs text-gray-600">
                from {data.metrics.uniqueProviders} providers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Market Sentiment
                {getSentimentIcon(data.metrics.sentiment)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge className={getSentimentColor(data.metrics.sentiment)}>
                  {data.metrics.sentiment}
                </Badge>
                <p className="text-xs text-gray-600">
                  {data.metrics.sentimentRatio}% {data.metrics.sentiment.toLowerCase()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.metrics.avgConfidence}%</div>
              <p className="text-xs text-gray-600">average confidence</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.metrics.performance.winRate}%</div>
              <p className="text-xs text-gray-600">
                {data.metrics.performance.closedPositions} closed positions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Assets</CardTitle>
            <CardDescription>Trading volume by asset over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.metrics.topTokens.map((token, index) => (
                <div key={token.token} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <span className="font-medium">{token.token}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{token.count} signals</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(token.count / data.metrics.topTokens[0].count) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Market Insights</CardTitle>
            <CardDescription>Key patterns and observations from recent trading activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.insights.map((insight, index) => {
                const cleanInsight = insight.replace(/\*\*(.*?)\*\*/g, '$1')
                const boldPart = insight.match(/\*\*(.*?)\*\*/)?.[1]
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="text-sm">
                      {boldPart && (
                        <span className="font-semibold text-gray-900">{boldPart}: </span>
                      )}
                      <span className="text-gray-600">
                        {cleanInsight.replace(`**${boldPart}**: `, '')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4 border-t">
          <p>Market intelligence based on verified on-chain trading signals</p>
          <p>Data sourced from <a href="/" className="text-blue-600 hover:underline">bankrsignals.com</a></p>
        </div>
      </div>
    </div>
  )
}