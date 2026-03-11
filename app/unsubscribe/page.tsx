'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'notfound'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('notfound');
      setMessage('Invalid unsubscribe link. Please contact support if you continue to receive emails.');
      return;
    }

    const unsubscribe = async () => {
      try {
        const response = await fetch(`/api/email/subscribe?token=${token}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.message || 'You have been successfully unsubscribed.');
          setEmail(result.email || '');
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to unsubscribe. Please contact support.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error occurred. Please try again later or contact support.');
      }
    };

    unsubscribe();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8">
          {status === 'loading' && (
            <div>
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h1 className="text-xl font-semibold text-[#e5e5e5] mb-2">Processing Unsubscribe</h1>
              <p className="text-[#737373]">Please wait while we process your request...</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="text-4xl mb-4">✅</div>
              <h1 className="text-xl font-semibold text-[#e5e5e5] mb-2">Unsubscribed Successfully</h1>
              <p className="text-[#b0b0b0] mb-4">{message}</p>
              {email && (
                <p className="text-sm text-[#737373] mb-4">
                  The email address <span className="text-[#e5e5e5]">{email}</span> will no longer receive our weekly digest.
                </p>
              )}
              <div className="text-sm text-[#666] bg-[#111] border border-[#222] rounded p-3 mb-6">
                <p className="mb-2">We're sorry to see you go! 😢</p>
                <p>If you change your mind, you can always subscribe again at bankrsignals.com</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="text-4xl mb-4">❌</div>
              <h1 className="text-xl font-semibold text-[#e5e5e5] mb-2">Unsubscribe Failed</h1>
              <p className="text-red-400 mb-4">{message}</p>
              <div className="text-sm text-[#737373] bg-[#111] border border-[#222] rounded p-3 mb-6">
                <p className="mb-2">Having trouble unsubscribing?</p>
                <p>Please contact us at support@bankrsignals.com with your email address and we'll remove you manually.</p>
              </div>
            </div>
          )}

          {status === 'notfound' && (
            <div>
              <div className="text-4xl mb-4">🔗</div>
              <h1 className="text-xl font-semibold text-[#e5e5e5] mb-2">Invalid Unsubscribe Link</h1>
              <p className="text-[#b0b0b0] mb-4">{message}</p>
              <div className="text-sm text-[#737373] bg-[#111] border border-[#222] rounded p-3 mb-6">
                <p className="mb-2">This link may be expired or incorrect.</p>
                <p>Contact us at support@bankrsignals.com if you need help unsubscribing.</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Bankr Signals
            </Link>
            
            {status === 'success' && (
              <Link 
                href="/#subscribe"
                className="px-6 py-2 border border-[#3a3a3a] text-[#a3a3a3] rounded-lg hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
              >
                Resubscribe
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-[#666] text-center">
          <p>Bankr Signals • AI Trading Signal Platform</p>
          <p className="mt-1">
            <Link href="/privacy" className="hover:text-[#999] transition-colors">Privacy Policy</Link>
            {' • '}
            <Link href="/terms" className="hover:text-[#999] transition-colors">Terms of Service</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}