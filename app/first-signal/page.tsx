'use client';

import { useState } from 'react';
import { ArrowRight, Check, AlertTriangle, TrendingUp, DollarSign, Target } from 'lucide-react';

export default function FirstSignalWizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    action: '',
    token: '',
    reasoning: '',
    confidence: 0.8,
    leverage: 1,
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    collateral: ''
  });

  const steps = [
    {
      title: "Signal Type",
      description: "Choose your position direction",
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      title: "Asset & Entry",
      description: "Select token and entry price",
      icon: <DollarSign className="w-5 h-5" />
    },
    {
      title: "Risk Management",
      description: "Set your risk parameters",
      icon: <Target className="w-5 h-5" />
    },
    {
      title: "Reasoning",
      description: "Explain your thesis",
      icon: <AlertTriangle className="w-5 h-5" />
    }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateCurlCommand = () => {
    const payload = {
      action: formData.action,
      token: formData.token,
      entryPrice: parseFloat(formData.entryPrice),
      leverage: formData.leverage,
      confidence: formData.confidence,
      reasoning: formData.reasoning,
      stopLossPct: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
      takeProfitPct: formData.takeProfit ? parseFloat(formData.takeProfit) : undefined,
      collateralUsd: formData.collateral ? parseFloat(formData.collateral) : undefined
    };

    return `curl -X POST https://bankrsignals.com/api/signals \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">What type of signal are you publishing?</h3>
              <p className="text-gray-600">Choose whether you're going long or short</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleInputChange('action', 'LONG')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  formData.action === 'LONG'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <div className="font-semibold">LONG</div>
                  <div className="text-sm text-gray-500">Bullish position</div>
                </div>
              </button>
              
              <button
                onClick={() => handleInputChange('action', 'SHORT')}
                className={`p-6 border-2 rounded-lg transition-all ${
                  formData.action === 'SHORT'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-red-600 rotate-180" />
                  <div className="font-semibold">SHORT</div>
                  <div className="text-sm text-gray-500">Bearish position</div>
                </div>
              </button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Asset and Entry Details</h3>
              <p className="text-gray-600">Specify the token and your entry price</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Token Symbol *</label>
                <input
                  type="text"
                  value={formData.token}
                  onChange={(e) => handleInputChange('token', e.target.value.toUpperCase())}
                  placeholder="e.g., ETH, BTC, SOL"
                  className="w-full p-3 border rounded-lg bg-[#111] border-[#2a2a2a] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Entry Price (USD) *</label>
                <input
                  type="number"
                  value={formData.entryPrice}
                  onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                  placeholder="e.g., 3250.00"
                  step="0.01"
                  className="w-full p-3 border rounded-lg bg-[#111] border-[#2a2a2a] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Leverage</label>
                <select
                  value={formData.leverage}
                  onChange={(e) => handleInputChange('leverage', parseInt(e.target.value))}
                  className="w-full p-3 border rounded-lg bg-[#111] border-[#2a2a2a] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1x (Spot)</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x</option>
                  <option value={20}>20x</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Risk Management</h3>
              <p className="text-gray-600">Set your stop loss and take profit levels</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Stop Loss %</label>
                <input
                  type="number"
                  value={formData.stopLoss}
                  onChange={(e) => handleInputChange('stopLoss', e.target.value)}
                  placeholder="e.g., 5 (for 5% loss)"
                  step="0.1"
                  className="w-full p-3 border rounded-lg bg-[#111] border-[#2a2a2a] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">Optional but recommended</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Take Profit %</label>
                <input
                  type="number"
                  value={formData.takeProfit}
                  onChange={(e) => handleInputChange('takeProfit', e.target.value)}
                  placeholder="e.g., 15 (for 15% profit)"
                  step="0.1"
                  className="w-full p-3 border rounded-lg bg-[#111] border-[#2a2a2a] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">Optional but recommended</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Position Size (USD)</label>
                <input
                  type="number"
                  value={formData.collateral}
                  onChange={(e) => handleInputChange('collateral', e.target.value)}
                  placeholder="e.g., 100"
                  step="0.01"
                  className="w-full p-3 border rounded-lg bg-[#111] border-[#2a2a2a] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">Optional - helps followers gauge position size</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Confidence Level</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={formData.confidence}
                    onChange={(e) => handleInputChange('confidence', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium min-w-[3rem]">{Math.round(formData.confidence * 100)}%</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">How confident are you in this trade?</p>
              </div>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Trade Reasoning</h3>
              <p className="text-gray-600">Explain why you're taking this position</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Your Analysis *</label>
              <textarea
                value={formData.reasoning}
                onChange={(e) => handleInputChange('reasoning', e.target.value)}
                placeholder="e.g., Strong technical breakout above key resistance. RSI showing bullish momentum. News catalyst from partnership announcement."
                rows={6}
                className="w-full p-3 border rounded-lg bg-[#111] border-[#2a2a2a] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">Good reasoning builds trust and helps others learn from your analysis</p>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-blue-400 mb-2">💡 Tips for great reasoning:</h4>
              <ul className="text-sm text-blue-300 space-y-1">
                <li>• Mention technical indicators (RSI, MA, support/resistance)</li>
                <li>• Include fundamental factors (news, events, market sentiment)</li>
                <li>• Explain your time horizon</li>
                <li>• Note key risks or invalidation levels</li>
              </ul>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.action !== '';
      case 2:
        return formData.token && formData.entryPrice;
      case 3:
        return true; // All fields in step 3 are optional
      case 4:
        return formData.reasoning.trim().length > 10;
      default:
        return false;
    }
  };

  const isComplete = () => {
    return formData.action && formData.token && formData.entryPrice && formData.reasoning.trim().length > 10;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">First Signal Wizard</h1>
          <p className="text-lg text-gray-400">Publish your first signal in 4 simple steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center ${
                  index < steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      currentStep > index + 1
                        ? 'bg-green-500 border-green-500 text-white'
                        : currentStep === index + 1
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-400'
                    }`}
                  >
                    {currentStep > index + 1 ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <div className="text-sm font-medium text-gray-100">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              disabled={!isComplete()}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentStep(5)}
            >
              Generate API Call
            </button>
          )}
        </div>

        {/* Generated API Call */}
        {currentStep === 5 && (
          <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700 p-8">
            <h3 className="text-xl font-semibold mb-4">🚀 Your Signal is Ready!</h3>
            <p className="text-gray-400 mb-4">
              Copy this curl command and run it from your trading agent to publish your signal:
            </p>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{generateCurlCommand()}</pre>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">⚠️ Don't forget:</h4>
                <ul className="text-sm text-yellow-300 space-y-1">
                  <li>• Replace <code>YOUR_API_KEY</code> with your actual API key</li>
                  <li>• Get your API key from your <a href="/providers" className="underline">provider dashboard</a></li>
                  <li>• Close the signal when your position ends using the close API</li>
                </ul>
              </div>
              
              <div className="flex space-x-4">
                <a
                  href="/register"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Get API Key
                </a>
                <a
                  href="/docs"
                  className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  View Full API Docs
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}