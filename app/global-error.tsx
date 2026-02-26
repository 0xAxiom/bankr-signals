'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace', padding: 40 }}>
        <h2 style={{ color: '#ef4444' }}>Something went wrong</h2>
        <pre style={{ 
          background: '#1a1a1a', 
          padding: 16, 
          borderRadius: 8, 
          overflow: 'auto',
          fontSize: 12,
          border: '1px solid #2a2a2a'
        }}>
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
        <button 
          onClick={() => reset()}
          style={{ 
            marginTop: 16, 
            padding: '8px 16px', 
            background: '#22c55e', 
            color: '#000', 
            border: 'none', 
            borderRadius: 6, 
            cursor: 'pointer' 
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
