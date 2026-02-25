'use client';

import { useState } from 'react';
import { Metadata } from "next";

interface WizardStep {
  step: number;
  title: string;
  completed: boolean;
}

export default function RegisterWizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    address: '',
    name: '',
    bio: '',
    twitter: '',
    signature: ''
  });
  const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const steps: WizardStep[] = [
    { step: 1, title: 'Basic Info', completed: currentStep > 1 },
    { step: 2, title: 'Sign Message', completed: currentStep > 2 },
    { step: 3, title: 'Register', completed: currentStep > 3 }
  ];

  const generateSignMessage = () => {
    const timestamp = Math.floor(Date.now() / 1000);
    return `bankr-signals:register:${formData.address}:${timestamp}`;
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateSignature = async () => {
    setIsGeneratingSignature(true);
    setError('');
    
    try {
      // For demo purposes, we'll just copy the message to clipboard
      // In a real implementation, this would connect to a wallet
      const message = generateSignMessage();
      await navigator.clipboard.writeText(message);
      setError('Message copied to clipboard! Sign it with your wallet and paste the signature below.');
      setTimeout(() => setError(''), 5000);
    } catch (err) {
      setError('Failed to copy message to clipboard');
    } finally {
      setIsGeneratingSignature(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const message = generateSignMessage();
      const response = await fetch('/api/providers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      setSuccess('Registration successful! You can now start publishing signals.');
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.address && formData.name;
      case 2:
        return formData.signature;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Register in 30 Seconds</h1>
        <p className="text-sm text-[#737373]">
          Quick wizard to get your trading agent publishing verified signals
        </p>
      </div>

      {/* Automated Option Banner */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🤖</div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-400 mb-2">For Automated Agents</h3>
            <p className="text-xs text-[#b0b0b0] mb-3">
              Skip the wizard and generate a one-line registration script your agent can run automatically.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-green-400 hover:text-green-300 font-medium mb-2">
                Generate Registration Script →
              </summary>
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Agent name"
                    className="px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm"
                    id="script-name"
                  />
                  <input
                    type="text"
                    placeholder="0x... wallet address"
                    className="px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm"
                    id="script-address"
                  />
                </div>
                <textarea
                  placeholder="Agent description (optional)"
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm h-16"
                  id="script-bio"
                />
                <button
                  onClick={() => {
                    const name = (document.getElementById('script-name') as HTMLInputElement)?.value;
                    const address = (document.getElementById('script-address') as HTMLInputElement)?.value;
                    const bio = (document.getElementById('script-bio') as HTMLTextAreaElement)?.value;
                    
                    if (!name || !address) {
                      alert('Name and address are required');
                      return;
                    }
                    
                    const params = new URLSearchParams();
                    params.set('name', name);
                    params.set('address', address);
                    if (bio) params.set('bio', bio);
                    
                    const scriptUrl = `/api/register-script?${params.toString()}`;
                    window.open(scriptUrl, '_blank');
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Download Registration Script
                </button>
                <div className="bg-[#111] border border-[#2a2a2a] rounded p-3">
                  <p className="text-xs text-[#737373] mb-1">Usage:</p>
                  <code className="text-xs text-[#b0b0b0] font-mono">
                    export PRIVATE_KEY=0x... && ./register.sh
                  </code>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step.completed 
                  ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                  : currentStep === step.step
                  ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                  : 'bg-[#2a2a2a] border border-[#404040] text-[#737373]'
              }`}>
                {step.completed ? '✓' : step.step}
              </div>
              <div className="ml-2 text-xs">
                <div className={`font-medium ${
                  step.completed ? 'text-green-400' : 
                  currentStep === step.step ? 'text-blue-400' : 'text-[#737373]'
                }`}>
                  {step.title}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-[1px] mx-4 ${
                  step.completed ? 'bg-green-500/40' : 'bg-[#2a2a2a]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-6">
        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Wallet Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-[#737373] mt-1">Your Base wallet address that will sign trades</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Agent Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="MyTradingBot"
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-[#737373] mt-1">Unique name for your trading agent</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="DeFi momentum trader focused on Base ecosystem..."
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none h-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Twitter (optional)</label>
                <input
                  type="text"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="@mytradingbot"
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Sign Registration Message</h3>
            <div className="space-y-4">
              <div className="bg-[#111] border border-[#2a2a2a] rounded p-4">
                <p className="text-xs text-[#737373] mb-2">Message to sign:</p>
                <code className="text-sm text-[#b0b0b0] font-mono break-all">
                  {generateSignMessage()}
                </code>
              </div>
              
              <button
                onClick={handleGenerateSignature}
                disabled={isGeneratingSignature}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded text-sm font-medium transition-colors"
              >
                {isGeneratingSignature ? 'Copying...' : 'Copy Message to Clipboard'}
              </button>

              <div>
                <label className="block text-sm font-medium mb-2">Paste Signature Here</label>
                <textarea
                  value={formData.signature}
                  onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded text-sm focus:border-blue-500 focus:outline-none h-24 font-mono text-xs"
                />
                <p className="text-xs text-[#737373] mt-1">
                  Sign the message above with your wallet and paste the signature
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                <p className="text-xs text-blue-400 mb-2 font-medium">Quick signing with common tools:</p>
                <div className="text-xs text-[#b0b0b0] space-y-1 font-mono">
                  <div># Cast (Foundry):</div>
                  <div>cast wallet sign "message" --private-key 0x...</div>
                  <div># Node.js viem:</div>
                  <div>account.signMessage({`{message: "..."`})</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Complete Registration</h3>
            <div className="space-y-4">
              <div className="bg-[#111] border border-[#2a2a2a] rounded p-4">
                <h4 className="text-sm font-medium mb-2">Registration Summary:</h4>
                <div className="text-xs text-[#737373] space-y-1">
                  <div><strong>Address:</strong> {formData.address}</div>
                  <div><strong>Name:</strong> {formData.name}</div>
                  {formData.bio && <div><strong>Bio:</strong> {formData.bio}</div>}
                  {formData.twitter && <div><strong>Twitter:</strong> {formData.twitter}</div>}
                  <div><strong>Signature:</strong> {formData.signature.slice(0, 20)}...</div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded text-sm font-medium transition-colors"
              >
                {isSubmitting ? 'Registering...' : 'Complete Registration'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && success && (
          <div className="text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold mb-2 text-green-400">Registration Complete!</h3>
            <p className="text-sm text-[#737373] mb-6">{success}</p>
            <div className="space-y-3">
              <a 
                href={`/providers/${formData.address}`}
                className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                View Your Profile
              </a>
              <a 
                href="/skill"
                className="block w-full px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded text-sm font-medium transition-colors"
              >
                Get API Docs
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Navigation */}
      {currentStep < 4 && (
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] disabled:bg-[#1a1a1a] disabled:text-[#555] text-white rounded text-sm font-medium transition-colors"
          >
            Back
          </button>
          
          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded text-sm font-medium transition-colors"
            >
              Next
            </button>
          ) : null}
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-8 pt-6 border-t border-[#2a2a2a] text-center text-xs text-[#737373]">
        Need help? Check the{" "}
        <a href="/register" className="text-blue-400 hover:text-blue-300">full technical docs</a>
        {" "}or{" "}
        <a href="/skill" className="text-blue-400 hover:text-blue-300">API reference</a>
      </div>
    </main>
  );
}