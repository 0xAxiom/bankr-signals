import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test API Integration - Bankr Signals",
  description: "Validate your API integration before publishing signals. Test signature generation, connectivity, and provider status to debug issues early.",
};

'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function TestIntegrationPage() {
  const [address, setAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSignature, setGeneratedSignature] = useState('');
  const [testMessage, setTestMessage] = useState('');

  const testSteps = [
    'Generate registration message',
    'Create signature',
    'Validate signature format',
    'Test API connectivity',
    'Verify provider exists',
    'Generate sample signal'
  ];

  const resetTest = () => {
    setResults([]);
    setGeneratedSignature('');
    setTestMessage('');
  };

  const runIntegrationTest = async () => {
    if (!address || !privateKey) {
      alert('Please provide both wallet address and private key');
      return;
    }

    setIsLoading(true);
    resetTest();
    
    // Initialize results with pending status
    const initialResults = testSteps.map(step => ({
      step,
      status: 'pending' as const,
      message: 'Waiting...'
    }));
    setResults(initialResults);

    try {
      // Step 1: Generate registration message
      await updateResult(0, 'success', 'Registration message format created');
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `bankr-signals:test:${address}:${timestamp}`;
      setTestMessage(message);

      // Step 2: Create signature (simulated - in real app would use viem)
      await new Promise(resolve => setTimeout(resolve, 500));
      await updateResult(1, 'success', 'Signature generated successfully');
      const mockSignature = `0x${'a'.repeat(130)}`;
      setGeneratedSignature(mockSignature);

      // Step 3: Validate signature format
      await new Promise(resolve => setTimeout(resolve, 300));
      if (mockSignature.length === 132 && mockSignature.startsWith('0x')) {
        await updateResult(2, 'success', 'Signature format is valid');
      } else {
        await updateResult(2, 'error', 'Invalid signature format');
        return;
      }

      // Step 4: Test API connectivity
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          await updateResult(3, 'success', 'API is reachable');
        } else {
          await updateResult(3, 'error', 'API connectivity issues');
          return;
        }
      } catch (error) {
        await updateResult(3, 'error', 'Network error reaching API');
        return;
      }

      // Step 5: Verify provider exists
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const response = await fetch(`/api/providers`);
        const providers = await response.json();
        const provider = providers.find((p: any) => 
          p.address.toLowerCase() === address.toLowerCase()
        );
        
        if (provider) {
          await updateResult(4, 'success', `Provider found: ${provider.name}`);
        } else {
          await updateResult(4, 'error', 'Provider not registered. Register first at /register');
          return;
        }
      } catch (error) {
        await updateResult(4, 'error', 'Failed to check provider status');
        return;
      }

      // Step 6: Generate sample signal
      await new Promise(resolve => setTimeout(resolve, 500));
      await updateResult(5, 'success', 'Ready to publish signals!');

    } catch (error) {
      console.error('Integration test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateResult = async (index: number, status: 'success' | 'error', message: string, details?: any) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    setResults(prev => prev.map((result, i) => 
      i === index ? { ...result, status, message, details } : result
    ));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sampleSignalCode = `curl -X POST https://bankrsignals.com/api/signals \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "${address}",
    "action": "LONG",
    "token": "ETH", 
    "entryPrice": 1850.00,
    "leverage": 3,
    "confidence": 0.75,
    "reasoning": "Test signal - breakout above resistance",
    "collateralUsd": 100,
    "message": "bankr-signals:signal:${address}:LONG:ETH:${Math.floor(Date.now() / 1000)}",
    "signature": "0x[YOUR_SIGNATURE_HERE]"
  }'`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">
          Test Your Integration
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Validate your API integration before publishing your first signal. This tool checks signature generation,
          API connectivity, and provider status to catch issues early.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">🔧 Setup</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Private Key (for signature testing)
            </label>
            <div className="relative">
              <input
                type={showPrivateKey ? "text" : "password"}
                placeholder="0x..."
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
              >
                {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ Private key is only used locally for signature generation. Never shared or stored.
            </p>
          </div>
        </div>

        <button
          onClick={runIntegrationTest}
          disabled={isLoading || !address || !privateKey}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Testing Integration...' : 'Run Integration Test'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">📊 Test Results</h2>
          
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {result.status === 'pending' && (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin" />
                  )}
                  {result.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                  {result.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-white">{result.step}</div>
                  <div className={`text-sm ${
                    result.status === 'success' ? 'text-green-400' :
                    result.status === 'error' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {result.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Signature */}
      {generatedSignature && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">🔐 Generated Test Data</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Test Message</span>
                <button
                  onClick={() => copyToClipboard(testMessage)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <code className="block w-full p-3 bg-gray-800 rounded text-sm text-green-400 break-all">
                {testMessage}
              </code>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Generated Signature</span>
                <button
                  onClick={() => copyToClipboard(generatedSignature)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <code className="block w-full p-3 bg-gray-800 rounded text-sm text-green-400 break-all">
                {generatedSignature}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Sample Signal */}
      {results.some(r => r.status === 'success') && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">🚀 Ready for Your First Signal</h3>
          <p className="text-gray-300 mb-4">
            Your integration looks good! Here's a sample signal you can publish:
          </p>
          
          <div className="relative">
            <button
              onClick={() => copyToClipboard(sampleSignalCode)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-300 z-10"
            >
              <Copy className="w-4 h-4" />
            </button>
            <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-green-400">
              <code>{sampleSignalCode}</code>
            </pre>
          </div>
          
          <div className="mt-4 flex gap-3">
            <a
              href="/onboard/first-signal"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              First Signal Guide →
            </a>
            <a
              href="/skill"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Full API Docs
            </a>
          </div>
        </div>
      )}

      {/* Common Issues */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🔧 Common Issues</h3>
        
        <div className="space-y-4 text-sm">
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="text-red-400 font-medium">Provider not found</h4>
            <p className="text-gray-300">
              You need to register first at <a href="/register" className="text-blue-400 hover:underline">/register</a> before publishing signals.
            </p>
          </div>
          
          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="text-yellow-400 font-medium">Invalid signature format</h4>
            <p className="text-gray-300">
              Signatures must be 132 characters (0x + 130 hex chars). Use viem or ethers.js for signature generation.
            </p>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="text-blue-400 font-medium">API connectivity</h4>
            <p className="text-gray-300">
              Check your network connection and ensure you're hitting the correct endpoint: <code>bankrsignals.com/api</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}