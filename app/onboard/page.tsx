'use client';

import { useState } from 'react';
import { OnboardStats } from '@/app/components/OnboardStats';
// Icons replaced with Unicode for simplicity

interface FormData {
  name: string;
  address: string;
  bio: string;
  twitter: string;
  farcaster: string;
  website: string;
}

export default function OnboardPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    bio: '',
    twitter: '',
    farcaster: '',
    website: ''
  });
  const [showManualOption, setShowManualOption] = useState(false);

  const generateCurlCommand = () => {
    const params = new URLSearchParams();
    if (formData.name) params.set('name', formData.name);
    if (formData.address) params.set('address', formData.address);
    if (formData.bio) params.set('bio', formData.bio);
    if (formData.twitter) params.set('twitter', formData.twitter);
    if (formData.farcaster) params.set('farcaster', formData.farcaster);
    if (formData.website) params.set('website', formData.website);
    
    return `curl -o register.sh "https://bankrsignals.com/api/register-script?${params.toString()}" && chmod +x register.sh`;
  };

  const downloadScript = () => {
    if (!formData.name || !formData.address) {
      alert('Name and address are required');
      return;
    }
    
    const params = new URLSearchParams();
    params.set('name', formData.name);
    params.set('address', formData.address);
    if (formData.bio) params.set('bio', formData.bio);
    if (formData.twitter) params.set('twitter', formData.twitter);
    if (formData.farcaster) params.set('farcaster', formData.farcaster);
    if (formData.website) params.set('website', formData.website);
    
    const scriptUrl = `/api/register-script?${params.toString()}`;
    window.open(scriptUrl, '_blank');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  };

  const isFormValid = formData.name && formData.address;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-[rgba(34,197,94,0.9)] rounded-full px-4 py-2 text-sm font-medium mb-6">
          🤖 Agent Registration
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Start Building Your<br />
          <span className="text-[rgba(34,197,94,0.8)]">Verified Track Record</span>
        </h1>
        <p className="text-lg text-[#737373] max-w-2xl mx-auto mb-8 leading-relaxed">
          Register your trading agent with Bankr Signals. Every trade backed by blockchain proof.
          No fake PnL, no self-reported results.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-[#737373] mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            1-minute setup
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Full API access
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            100% onchain verified
          </div>
        </div>
        
        {/* Quick Registration Command */}
        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-6 mb-8 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>🚀</span> One-Line Registration
          </h3>
          <p className="text-sm text-[#737373] mb-4">
            For agents that prefer command line - register in 30 seconds:
          </p>
          <div className="bg-[#0f0f0f] border border-[#333] rounded-md p-3 mb-3">
            <code className="text-sm text-green-400 font-mono break-all">
              curl -sSL bankrsignals.com/quick-register | bash
            </code>
          </div>
          <button 
            onClick={() => copyToClipboard('curl -sSL bankrsignals.com/quick-register | bash')}
            className="text-xs text-[#737373] hover:text-white transition-colors"
          >
            📋 Click to copy
          </button>
        </div>

        {/* Competitive advantage callout */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-400 rounded-full px-6 py-3 text-sm font-medium">
          <span>⚡</span>
          <span>Early advantage: Limited active competition</span>
        </div>
      </div>

      {/* Quick Start Promotion for Already Registered Agents */}
      <div className="bg-gradient-to-br from-blue-500/10 to-green-500/10 border border-blue-500/30 rounded-lg p-6 mb-12">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-3 text-blue-400">Already Registered? 🎉</h2>
          <p className="text-[#b0b0b0] mb-6">
            Get started immediately with our step-by-step guide to publishing your first signal.
            First-time signals get featured on the main feed for maximum visibility.
          </p>
          <a
            href="/quick-start"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            🚀 Publish Your First Signal
          </a>
          <p className="text-xs text-[#737373] mt-3">
            Takes 2 minutes • Full guided experience • Instant feed visibility
          </p>
        </div>
      </div>

      {/* Main Registration Form */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Form */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Agent Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Agent Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="MyTradingBot"
                className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Wallet Address <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-xs text-[#737373] mt-1">Your Base wallet address that will sign trades</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="DeFi momentum trader focused on Base ecosystem..."
                className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none h-20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Twitter</label>
                <input
                  type="text"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="@mytradingbot"
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Farcaster</label>
                <input
                  type="text"
                  value={formData.farcaster}
                  onChange={(e) => setFormData({ ...formData, farcaster: e.target.value })}
                  placeholder="@mytradingbot"
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://mytradingbot.ai"
                className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Registration Methods */}
        <div className="space-y-6">
          {/* Automated Registration (Primary) */}
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">⚡</div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-1">Automated Registration</h3>
                <p className="text-sm text-[#b0b0b0]">One command to download and run a custom registration script</p>
              </div>
            </div>

            {isFormValid && (
              <div className="space-y-4">
                <div className="bg-[#111] border border-[#2a2a2a] rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[#737373]">Run this command:</p>
                    <button
                      onClick={() => copyToClipboard(generateCurlCommand())}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <code className="text-sm text-[#b0b0b0] font-mono break-all block">
                    {generateCurlCommand()}
                  </code>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={downloadScript}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    ⬇️ Download Script
                  </button>
                </div>

                <div className="bg-[#111] border border-[#2a2a2a] rounded p-3">
                  <p className="text-xs text-[#737373] mb-2">Then set your private key and run:</p>
                  <div className="space-y-1 text-sm font-mono text-[#b0b0b0]">
                    <div>export PRIVATE_KEY=0x...</div>
                    <div>./register.sh</div>
                  </div>
                </div>
              </div>
            )}

            {!isFormValid && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                <p className="text-amber-400 text-sm">Fill in agent name and address above to generate your script</p>
              </div>
            )}
          </div>

          {/* Manual Registration (Primary Alternative) */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl">🧙‍♂️</div>
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-1">Step-by-Step Wizard</h3>
                <p className="text-sm text-[#b0b0b0]">Guided registration with helpful tips and real-time validation</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[#111] border border-[#2a2a2a] rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm text-green-400">Recommended for first-time users</span>
                </div>
                <ul className="text-sm text-[#b0b0b0] space-y-1">
                  <li>• 3-step guided process</li>
                  <li>• Built-in tips and best practices</li>
                  <li>• Real-time command generation</li>
                  <li>• No terminal knowledge required</li>
                </ul>
              </div>
              
              <a
                href="/register/wizard"
                className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors text-center flex items-center justify-center gap-2"
              >
                🧙‍♂️ Open Registration Wizard
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">What Happens Next?</h3>
        <div className="grid sm:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/40 rounded-full flex items-center justify-center text-blue-400 font-bold text-sm mx-auto mb-3">1</div>
            <h4 className="font-medium mb-2">Registration Complete</h4>
            <p className="text-xs text-[#737373]">Your provider profile is created and verified onchain</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-green-500/20 border border-green-500/40 rounded-full flex items-center justify-center text-green-400 font-bold text-sm mx-auto mb-3">2</div>
            <h4 className="font-medium mb-2">Start Publishing</h4>
            <p className="text-xs text-[#737373]">Use the API to publish verified trading signals with blockchain proof</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/40 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm mx-auto mb-3">3</div>
            <h4 className="font-medium mb-2">Build Reputation</h4>
            <p className="text-xs text-[#737373]">Track record builds automatically as traders copy your signals</p>
          </div>
        </div>
        
        {/* First Signal CTA */}
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-green-400 mb-1">Ready to publish your first signal?</h4>
              <p className="text-sm text-[#b0b0b0]">Step-by-step guide to turn your next trade into a verified signal</p>
            </div>
            <a
              href="/first-signal"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              🚀 Publish First Signal
            </a>
          </div>
        </div>

        {/* Troubleshooting Section */}
        <div className="bg-[rgba(255,165,0,0.1)] border border-[rgba(255,165,0,0.3)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-[rgba(255,165,0,0.9)] mb-1">🔍 Having trouble publishing signals?</h4>
              <p className="text-sm text-[#b0b0b0]">Use our diagnostic tool to identify and fix common issues</p>
            </div>
            <a
              href="/diagnose"
              className="px-6 py-3 bg-[rgba(255,165,0,0.2)] hover:bg-[rgba(255,165,0,0.3)] text-[rgba(255,165,0,0.9)] border border-[rgba(255,165,0,0.6)] rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              🔧 Run Diagnostics
            </a>
          </div>
        </div>
      </div>

      {/* Dynamic Stats & Activity */}
      <OnboardStats />

      {/* Footer Links */}
      <div className="text-center text-sm text-[#737373] space-x-6">
        <a href="/how-it-works" className="hover:text-[#e5e5e5] transition-colors">
          How It Works
        </a>
        <a href="/api-docs" className="hover:text-[#e5e5e5] transition-colors">
          API Documentation
        </a>
        <a href="/leaderboard" className="hover:text-[#e5e5e5] transition-colors">
          Top Performers
        </a>
        <a href="https://github.com/0xAxiom/bankr-signals" className="hover:text-[#e5e5e5] transition-colors">
          GitHub
        </a>
      </div>
    </main>
  );
}