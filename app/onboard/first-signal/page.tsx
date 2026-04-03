'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, Shield, Target, Clock } from 'lucide-react';

export default function FirstSignalWizard() {
  const [step, setStep] = useState(1);
  const [signalData, setSignalData] = useState({
    action: '',
    token: '',
    reasoning: '',
    confidence: 0.5,
    timeframe: '',
    entryPrice: '',
    leverage: 1,
    stopLoss: '',
    takeProfit: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setIsSubmitting(false);
    }, 2000);
  };

  const examples = [
    {
      action: 'LONG',
      token: 'ETH',
      reasoning: 'ETH breaking above $3200 resistance with strong volume. RSI oversold bounce likely.',
      confidence: 0.8,
      timeframe: '1-2 weeks',
      highlight: 'Technical breakout'
    },
    {
      action: 'SHORT',
      token: 'BTC',
      reasoning: 'Bitcoin showing bearish divergence on 4H chart. Fed meeting tomorrow could trigger selling.',
      confidence: 0.7,
      timeframe: '3-5 days',
      highlight: 'Macro event'
    },
    {
      action: 'LONG',
      token: 'SOL',
      reasoning: 'Solana ecosystem heating up with new DEX launches. Undervalued vs ETH.',
      confidence: 0.6,
      timeframe: '1 month',
      highlight: 'Fundamental play'
    }
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-green-800">First Signal Published! 🎉</CardTitle>
              <CardDescription className="text-green-700">
                Your signal is now live on bankrsignals.com and will be tracked for performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold mb-2">Your Signal Summary:</h3>
                <div className="grid gap-2 text-sm">
                  <div><strong>Action:</strong> <Badge>{signalData.action}</Badge> {signalData.token}</div>
                  <div><strong>Reasoning:</strong> {signalData.reasoning}</div>
                  <div><strong>Confidence:</strong> {Math.round(signalData.confidence * 100)}%</div>
                  <div><strong>Timeframe:</strong> {signalData.timeframe}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-green-800">What happens next?</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Your signal appears on the live feed immediately</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Live PnL tracking updates automatically</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>You can close the position anytime to lock in results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Your track record builds with each signal</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <a href="/feed">View Live Feed</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/provider/your-address">Your Profile</a>
                </Button>
              </div>

              <div className="text-center text-sm text-green-600">
                <strong>Pro tip:</strong> Consistent quality signals build more credibility than frequent low-confidence ones.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Publish Your First Signal
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Share your next trade with the community in 4 easy steps
          </p>
          <div className="flex justify-center items-center space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i}
                </div>
                {i < 4 && <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {step === 1 && <Target className="h-5 w-5" />}
                  {step === 2 && <TrendingUp className="h-5 w-5" />}
                  {step === 3 && <Shield className="h-5 w-5" />}
                  {step === 4 && <Clock className="h-5 w-5" />}
                  
                  {step === 1 && 'Trade Direction & Asset'}
                  {step === 2 && 'Your Thesis'}
                  {step === 3 && 'Risk Management'}
                  {step === 4 && 'Review & Publish'}
                </CardTitle>
                <CardDescription>
                  {step === 1 && 'What position are you taking and in which asset?'}
                  {step === 2 && 'Why do you believe this trade will be profitable?'}
                  {step === 3 && 'How will you manage risk and take profits?'}
                  {step === 4 && 'Double-check your signal before publishing'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="action">Trade Direction</Label>
                        <Select value={signalData.action} onValueChange={(value) => 
                          setSignalData({...signalData, action: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LONG">LONG (Buy/Bullish)</SelectItem>
                            <SelectItem value="SHORT">SHORT (Sell/Bearish)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="token">Asset/Token</Label>
                        <Input
                          id="token"
                          placeholder="e.g., ETH, BTC, SOL"
                          value={signalData.token}
                          onChange={(e) => setSignalData({...signalData, token: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="entryPrice">Entry Price (optional)</Label>
                        <Input
                          id="entryPrice"
                          placeholder="e.g., $3200"
                          value={signalData.entryPrice}
                          onChange={(e) => setSignalData({...signalData, entryPrice: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="timeframe">Expected Timeframe</Label>
                        <Select value={signalData.timeframe} onValueChange={(value) => 
                          setSignalData({...signalData, timeframe: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="How long?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours (scalp)</SelectItem>
                            <SelectItem value="days">Days (swing)</SelectItem>
                            <SelectItem value="weeks">Weeks (position)</SelectItem>
                            <SelectItem value="months">Months (hold)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reasoning">Your Trading Thesis</Label>
                      <Textarea
                        id="reasoning"
                        placeholder="Explain why you believe this trade will be profitable. Include technical analysis, fundamental factors, or market conditions..."
                        rows={5}
                        value={signalData.reasoning}
                        onChange={(e) => setSignalData({...signalData, reasoning: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label>Confidence Level: {Math.round(signalData.confidence * 100)}%</Label>
                      <div className="mt-2">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={signalData.confidence}
                          onChange={(e) => setSignalData({...signalData, confidence: parseFloat(e.target.value)})}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Low confidence</span>
                          <span>High confidence</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="leverage">Leverage (optional)</Label>
                        <Select value={signalData.leverage.toString()} onValueChange={(value) => 
                          setSignalData({...signalData, leverage: parseInt(value)})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1x (Spot)</SelectItem>
                            <SelectItem value="2">2x</SelectItem>
                            <SelectItem value="3">3x</SelectItem>
                            <SelectItem value="5">5x</SelectItem>
                            <SelectItem value="10">10x</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="stopLoss">Stop Loss (optional)</Label>
                        <Input
                          id="stopLoss"
                          placeholder="e.g., $3000 or -5%"
                          value={signalData.stopLoss}
                          onChange={(e) => setSignalData({...signalData, stopLoss: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="takeProfit">Take Profit (optional)</Label>
                        <Input
                          id="takeProfit"
                          placeholder="e.g., $3500 or +10%"
                          value={signalData.takeProfit}
                          onChange={(e) => setSignalData({...signalData, takeProfit: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">💡 Pro Tips for Risk Management</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Set stop losses to limit downside risk</li>
                        <li>• Use position sizing appropriate for your confidence level</li>
                        <li>• Consider taking partial profits at key levels</li>
                        <li>• Lower leverage = more sustainable trading</li>
                      </ul>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3">Signal Summary</h3>
                      <div className="grid gap-2 text-sm">
                        <div><strong>Action:</strong> <Badge>{signalData.action}</Badge> {signalData.token}</div>
                        <div><strong>Entry:</strong> {signalData.entryPrice || 'Market price'}</div>
                        <div><strong>Timeframe:</strong> {signalData.timeframe}</div>
                        <div><strong>Leverage:</strong> {signalData.leverage}x</div>
                        <div><strong>Confidence:</strong> {Math.round(signalData.confidence * 100)}%</div>
                        <div><strong>Stop Loss:</strong> {signalData.stopLoss || 'Not set'}</div>
                        <div><strong>Take Profit:</strong> {signalData.takeProfit || 'Not set'}</div>
                      </div>
                    </div>
                    
                    <div>
                      <strong>Thesis:</strong>
                      <p className="mt-1 text-gray-700">{signalData.reasoning}</p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-2">⚠️ Before Publishing</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Your signal will be public and tracked</li>
                        <li>• You can update or close the position anytime</li>
                        <li>• Performance affects your leaderboard ranking</li>
                        <li>• Quality signals build long-term credibility</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-6">
                  {step > 1 && (
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                  )}
                  
                  <div className="ml-auto">
                    {step < 4 ? (
                      <Button onClick={handleNext} disabled={
                        (step === 1 && (!signalData.action || !signalData.token)) ||
                        (step === 2 && !signalData.reasoning)
                      }>
                        Next Step <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSubmitting ? 'Publishing...' : 'Publish Signal 🚀'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Signal Examples</CardTitle>
                <CardDescription>Get inspired by quality signals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {examples.map((example, i) => (
                  <div key={i} className="border-l-4 border-blue-500 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={example.action === 'LONG' ? 'default' : 'destructive'}>
                        {example.action}
                      </Badge>
                      <span className="font-medium">{example.token}</span>
                      <Badge variant="outline" className="text-xs">{example.highlight}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{example.reasoning}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      Confidence: {Math.round(example.confidence * 100)}% • {example.timeframe}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why Publish Signals?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>Build verified track record</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>Gain credibility & followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  <span>Transparent performance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span>Real-time PnL tracking</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}