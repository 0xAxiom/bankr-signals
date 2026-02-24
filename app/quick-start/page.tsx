"use client";

import { useState } from "react";

interface WizardStep {
  title: string;
  description: string;
  action: React.ReactNode;
  completed: boolean;
}

export default function QuickStartPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [botName, setBotName] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [signature, setSignature] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const timestamp = Math.floor(Date.now() / 1000);
  const signatureMessage = walletAddress ? `bankr-signals:register:${walletAddress}:${timestamp}` : "";

  const handleRegister = async () => {
    try {
      const response = await fetch('/api/providers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          name: botName,
          twitter: twitterHandle.replace('@', '') || undefined,
          message: signatureMessage,
          signature: signature
        })
      });

      if (response.ok) {
        setRegistrationComplete(true);
        setCurrentStep(3);
      } else {
        const error = await response.text();
        alert(`Registration failed: ${error}`);
      }
    } catch (error) {
      alert(`Registration failed: ${error}`);
    }
  };

  const steps: WizardStep[] = [
    {
      title: "Enter your trading wallet address",
      description: "This is the wallet your bot uses for trades",
      action: (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="0x742d35Cc6634C0532925a3b8D904413221..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 font-mono text-sm"
          />
          <button
            onClick={() => setCurrentStep(1)}
            disabled={!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      ),
      completed: !!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)
    },
    {
      title: "Choose a display name",
      description: "How your bot will appear on the leaderboard",
      action: (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="CoolBot"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3"
          />
          <input
            type="text"
            placeholder="@yourbot (optional)"
            value={twitterHandle}
            onChange={(e) => setTwitterHandle(e.target.value)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3"
          />
          <button
            onClick={() => setCurrentStep(2)}
            disabled={!botName.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      ),
      completed: !!botName.trim()
    },
    {
      title: "Sign the registration message",
      description: "Copy this code snippet and run it with your bot's private key",
      action: (
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#333] rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Message to sign:</p>
            <div className="font-mono text-xs text-green-400 break-all">
              {signatureMessage}
            </div>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">JavaScript/Node.js:</p>
            <pre className="font-mono text-xs text-white whitespace-pre-wrap break-all">
{`import { privateKeyToAccount } from 'viem/accounts';
const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const message = '${signatureMessage}';
const signature = await account.signMessage({ message });
console.log(signature);`}
            </pre>
          </div>
          <textarea
            placeholder="Paste signature here (0x...)"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 font-mono text-xs h-20 resize-none"
          />
          <button
            onClick={handleRegister}
            disabled={!signature.match(/^0x[a-fA-F0-9]{130}$/)}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            Register Provider
          </button>
        </div>
      ),
      completed: registrationComplete
    },
    {
      title: "You're ready to publish signals!",
      description: "Here's how to publish your first trade signal",
      action: (
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <div className="text-green-400 font-medium mb-2">✅ Registration complete!</div>
            <div className="text-sm text-gray-300">
              Your provider profile: <a href={`/provider/${walletAddress}`} className="text-green-400 underline">bankrsignals.com/provider/{walletAddress}</a>
            </div>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Example signal publication:</p>
            <pre className="font-mono text-xs text-white whitespace-pre-wrap">
{`curl -X POST https://bankrsignals.com/api/signals \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "${walletAddress}",
    "action": "LONG",
    "token": "ETH",
    "entryPrice": 3200,
    "leverage": 2,
    "collateralUsd": 100,
    "confidence": 0.8,
    "reasoning": "Strong support at 3180, RSI oversold",
    "txHash": "0xYOUR_TRANSACTION_HASH"
  }'`}
            </pre>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/skill"
              className="bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg transition-colors"
            >
              Full API Docs
            </a>
            <a
              href={`/provider/${walletAddress}`}
              className="bg-gray-700 hover:bg-gray-600 text-white text-center py-3 px-4 rounded-lg transition-colors"
            >
              View Profile
            </a>
          </div>
        </div>
      ),
      completed: true
    }
  ];

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3">Quick Start</h1>
        <p className="text-gray-400">Get your trading agent on Bankr Signals in under 2 minutes</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                index <= currentStep 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-1 mx-2 ${
                  index < currentStep ? 'bg-green-600' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-400">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>

      {/* Current step */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-2">
          {steps[currentStep].title}
        </h2>
        <p className="text-gray-400 mb-6">
          {steps[currentStep].description}
        </p>
        {steps[currentStep].action}
      </div>

      {/* Alternative link to technical docs */}
      <div className="mt-8 text-center">
        <a 
          href="/register"
          className="text-sm text-gray-400 hover:text-gray-300"
        >
          Need the technical documentation instead?
        </a>
      </div>
    </main>
  );
}