'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ 
      maxWidth: 600, 
      margin: '40px auto', 
      padding: 24, 
      background: '#1a1a1a', 
      borderRadius: 12, 
      border: '1px solid #2a2a2a',
      fontFamily: 'monospace'
    }}>
      <h2 style={{ color: '#ef4444', marginBottom: 16 }}>Error</h2>
      <pre style={{ 
        background: '#0a0a0a', 
        padding: 16, 
        borderRadius: 8, 
        overflow: 'auto',
        fontSize: 11,
        color: '#999',
        border: '1px solid #2a2a2a',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
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
          cursor: 'pointer',
          fontSize: 13
        }}
      >
        Try again
      </button>
    </div>
  );
}
