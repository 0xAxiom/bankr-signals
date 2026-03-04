'use client';

import { useState } from 'react';

interface EmailSubscriptionProps {
  source?: string;
  className?: string;
}

export function EmailSubscription({ source = 'website', className = '' }: EmailSubscriptionProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source,
          referrer: document.referrer || window.location.href,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        setEmail('');
        setName('');
      } else {
        setStatus('error');
        setMessage(result.message || 'Failed to subscribe');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className={`p-4 bg-green-900/20 border border-green-500/30 rounded-lg ${className}`}>
        <div className="text-green-400 font-medium mb-2">✅ Subscribed!</div>
        <p className="text-sm text-gray-300">{message}</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gray-900/50 border border-gray-700 rounded-lg ${className}`}>
      <h3 className="text-white font-semibold mb-2">📊 Weekly Digest</h3>
      <p className="text-sm text-gray-400 mb-4">
        Get the best trading signals and performance insights delivered every Sunday.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
            disabled={status === 'loading'}
            required
          />
        </div>
        
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
            disabled={status === 'loading'}
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>

      {status === 'error' && (
        <div className="mt-3 text-red-400 text-sm">
          {message}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        We respect your privacy. Unsubscribe at any time.
      </p>
    </div>
  );
}