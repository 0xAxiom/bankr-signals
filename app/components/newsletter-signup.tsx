'use client';

import React, { useState } from 'react';

interface NewsletterSignupProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'sidebar' | 'footer';
}

export default function NewsletterSignup({ 
  className = '', 
  size = 'md',
  variant = 'default'
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setIsLoading(true);
    setStatus('idle');
    
    try {
      const response = await fetch('/api/email/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: 'website'
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage(result.message || 'Successfully subscribed!');
        setEmail('');
        setName('');
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to subscribe. Please try again.');
      }
      
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Styling variants
  const variants = {
    default: {
      container: 'bg-gradient-to-r from-blue-600/10 to-green-600/10 border border-blue-600/20 rounded-lg',
      title: 'text-lg font-semibold text-[#e5e5e5] mb-2',
      description: 'text-sm text-[#b0b0b0] mb-4',
      form: 'space-y-3',
      input: 'w-full px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#e5e5e5] placeholder-[#737373] focus:border-blue-500/50 focus:outline-none',
      button: 'w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors'
    },
    sidebar: {
      container: 'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg',
      title: 'text-base font-semibold text-[#e5e5e5] mb-2',
      description: 'text-xs text-[#999] mb-3',
      form: 'space-y-2',
      input: 'w-full px-3 py-2 text-sm bg-[#111] border border-[#2a2a2a] rounded text-[#e5e5e5] placeholder-[#666] focus:border-blue-500/50 focus:outline-none',
      button: 'w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded font-medium transition-colors'
    },
    footer: {
      container: 'bg-[#111] border border-[#222] rounded-lg',
      title: 'text-base font-semibold text-[#e5e5e5] mb-2',
      description: 'text-xs text-[#888] mb-3',
      form: 'flex gap-2',
      input: 'flex-1 px-3 py-2 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[#e5e5e5] placeholder-[#666] focus:border-blue-500/50 focus:outline-none',
      button: 'px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded font-medium transition-colors whitespace-nowrap'
    }
  };

  const styling = variants[variant];

  if (status === 'success') {
    return (
      <div className={`${styling.container} p-6 ${className}`}>
        <div className="text-center">
          <div className="text-2xl mb-2">✉️</div>
          <div className="text-green-400 font-medium mb-1">Subscribed!</div>
          <div className="text-sm text-[#b0b0b0]">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styling.container} p-6 ${className}`}>
      <h3 className={styling.title}>📊 Weekly Signals Digest</h3>
      <p className={styling.description}>
        Get the best performing signals and top traders delivered to your inbox every Monday.
      </p>
      
      <form onSubmit={handleSubmit} className={styling.form}>
        {variant === 'footer' ? (
          // Horizontal layout for footer
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className={styling.input}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !email}
              className={styling.button}
            >
              {isLoading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </>
        ) : (
          // Vertical layout for default and sidebar
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className={styling.input}
              disabled={isLoading}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className={styling.input}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !email}
              className={styling.button}
            >
              {isLoading ? 'Subscribing...' : 'Subscribe to Weekly Digest'}
            </button>
          </>
        )}
      </form>

      {status === 'error' && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
          {message}
        </div>
      )}

      <div className="mt-3 text-xs text-[#666] text-center">
        Free weekly digest • No spam • Unsubscribe anytime
      </div>
    </div>
  );
}