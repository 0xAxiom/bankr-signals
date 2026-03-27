'use client';

import { useState } from 'react';

export default function DigestAdminPage() {
  const [digestData, setDigestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDigest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/email-digest');
      const data = await response.json();
      
      if (response.ok) {
        setDigestData(data);
      } else {
        setError(data.error || 'Failed to generate digest');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const openPreview = () => {
    window.open('/api/email-digest?preview=true', '_blank');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5]">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📊 Weekly Digest Admin</h1>
          <p className="text-[#737373]">
            Generate and preview weekly top signals email digest
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={generateDigest}
              disabled={loading}
              className="px-6 py-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-[#374151] text-black font-medium rounded-lg transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Digest'}
            </button>
            
            {digestData && (
              <button
                onClick={openPreview}
                className="px-6 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg transition-colors"
              >
                Preview Email
              </button>
            )}
          </div>
          
          <p className="text-sm text-[#737373]">
            This generates a digest of the top performing signals from the past 7 days.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-[#1a1a1a] border border-[rgba(239,68,68,0.3)] rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-[#ef4444]">
              <span>❌</span>
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Digest Results */}
        {digestData && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">📈 Digest Summary</h2>
              
              {digestData.success ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#22c55e]">
                      {digestData.digest?.signalsCount || 0}
                    </div>
                    <div className="text-sm text-[#737373]">Top Signals</div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#22c55e]">
                      {digestData.digest?.avgPnl ? `${digestData.digest.avgPnl.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-sm text-[#737373]">Avg PnL</div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#22c55e]">
                      {digestData.digest?.totalDollarPnl ? formatCurrency(digestData.digest.totalDollarPnl) : 'N/A'}
                    </div>
                    <div className="text-sm text-[#737373]">Total PnL</div>
                  </div>
                </div>
              ) : (
                <div className="text-[#737373] text-center py-8">
                  <p>No completed signals found for the past week</p>
                </div>
              )}
              
              {digestData.digest && (
                <div className="mt-4 text-sm text-[#737373]">
                  Period: {digestData.digest.weekStart} - {digestData.digest.weekEnd}
                </div>
              )}
            </div>

            {/* Signal List */}
            {digestData.signals && digestData.signals.length > 0 && (
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">🎯 Top Signals Included</h2>
                
                <div className="space-y-3">
                  {digestData.signals.map((signal: any, index: number) => (
                    <div
                      key={signal.id}
                      className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#737373] font-mono">#{index + 1}</span>
                        <span className={`text-xs px-2 py-1 rounded font-bold ${
                          signal.action === 'LONG' || signal.action === 'BUY'
                            ? 'bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]'
                            : 'bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]'
                        }`}>
                          {signal.action}
                        </span>
                        <span className="font-mono font-semibold">${signal.token}</span>
                        <span className="text-xs text-[#737373]">by {signal.provider}</span>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-[#22c55e]">
                          {signal.pnl >= 0 ? '+' : ''}{signal.pnl.toFixed(1)}%
                        </div>
                        <div className="text-xs text-[#737373]">
                          {formatCurrency(signal.dollarPnl)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Send Section */}
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">📧 Email Distribution</h2>
              
              <div className="bg-[#1a1a1a] border border-[rgba(234,179,8,0.3)] rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-[rgba(234,179,8,0.8)] mb-2">
                  <span>⚠️</span>
                  <span className="font-medium">Email Service Not Configured</span>
                </div>
                <p className="text-sm text-[#737373]">
                  Email sending is not yet configured. To enable automated weekly digests:
                </p>
                <ol className="list-decimal list-inside text-sm text-[#737373] mt-2 space-y-1 ml-4">
                  <li>Set up Resend API key in environment</li>
                  <li>Uncomment email sending code in the API route</li>
                  <li>Add subscriber management system</li>
                  <li>Schedule weekly cron job: <code className="bg-[#2a2a2a] px-1">scripts/weekly-digest.sh</code></li>
                </ol>
              </div>
              
              <div className="text-sm text-[#737373]">
                <p className="mb-2">
                  <strong>Manual Distribution:</strong> Use the "Preview Email" button to copy the digest 
                  and manually send to your subscriber list.
                </p>
                <p>
                  <strong>Automation:</strong> Run <code className="bg-[#2a2a2a] px-1">scripts/weekly-digest.sh</code> 
                  weekly via cron to generate and send automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-[#111111] border border-[#2a2a2a] rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🛠️ Setup Instructions</h2>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-[#e5e5e5] mb-2">1. Test the Digest</h3>
              <p className="text-[#737373]">
                Click "Generate Digest" to create a weekly summary and "Preview Email" to see the formatted email.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[#e5e5e5] mb-2">2. Automate Weekly Sending</h3>
              <p className="text-[#737373] mb-2">Add this to your crontab to run every Sunday at 9 AM:</p>
              <code className="block bg-[#1a1a1a] border border-[#2a2a2a] rounded p-2 font-mono text-xs">
                0 9 * * 0 /path/to/bankr-signals/scripts/weekly-digest.sh
              </code>
            </div>
            
            <div>
              <h3 className="font-semibold text-[#e5e5e5] mb-2">3. Configure Email Service</h3>
              <p className="text-[#737373]">
                Set up Resend, SendGrid, or another email service and update the API route to actually send emails.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}