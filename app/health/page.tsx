'use client';

import { useState, useEffect } from 'react';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'error' | 'warning';
  responseTime?: number;
  statusCode?: number;
  error?: string;
  hasData?: boolean;
}

interface HealthResults {
  timestamp: string;
  overall: 'healthy' | 'warning' | 'critical';
  pages: HealthCheck[];
  apis: HealthCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    warnings: number;
    successRate: number;
    avgResponseTime: number;
  };
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'pass':
      return <span className="text-green-500">✅</span>;
    case 'fail':
      return <span className="text-red-500">❌</span>;
    case 'error':
      return <span className="text-red-500">💥</span>;
    case 'warning':
      return <span className="text-yellow-500">⚠️</span>;
    default:
      return <span className="text-gray-500">❓</span>;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health-check');
      const data = await response.json();
      
      if (data.success) {
        setHealth(data.results);
        setLastChecked(new Date());
      } else {
        throw new Error(data.error || 'Health check failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run health check');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  if (loading && !health) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <div className="text-4xl mb-4">🏥</div>
          <h1 className="text-2xl font-bold mb-4">Running Health Check...</h1>
          <p className="text-[#737373]">Testing all endpoints and functionality</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="text-center">
          <div className="text-4xl mb-4">💥</div>
          <h1 className="text-2xl font-bold mb-4">Health Check Failed</h1>
          <p className="text-red-500 mb-6">{error}</p>
          <button
            onClick={runHealthCheck}
            className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.4)] text-[rgba(34,197,94,0.9)] px-6 py-2 rounded-lg hover:bg-[rgba(34,197,94,0.15)] transition-colors"
          >
            Retry Health Check
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Site Health Dashboard</h1>
          <p className="text-[#737373]">
            Real-time monitoring of all critical endpoints and functionality
          </p>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.4)] text-[rgba(34,197,94,0.9)] px-4 py-2 rounded-lg hover:bg-[rgba(34,197,94,0.15)] transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {health && (
        <>
          {/* Overall Status */}
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getStatusColor(health.overall)}`}>
                  {health.overall.toUpperCase()}
                </div>
                <div className="text-sm text-[#737373] mt-1">Overall Status</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#e5e5e5]">
                  {health.summary.successRate}%
                </div>
                <div className="text-sm text-[#737373] mt-1">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#e5e5e5]">
                  {health.summary.avgResponseTime}ms
                </div>
                <div className="text-sm text-[#737373] mt-1">Avg Response</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#e5e5e5]">
                  {health.summary.passed}/{health.summary.total}
                </div>
                <div className="text-sm text-[#737373] mt-1">Checks Passed</div>
              </div>
            </div>

            {lastChecked && (
              <div className="text-center mt-4 text-sm text-[#737373]">
                Last checked: {lastChecked.toLocaleString()}
              </div>
            )}
          </div>

          {/* Pages Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">📄 Page Health</h3>
              <div className="space-y-3">
                {health.pages.map((page, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={page.status} />
                      <span className="text-[#e5e5e5]">{page.name}</span>
                    </div>
                    <div className="text-sm text-[#737373]">
                      {page.responseTime ? `${page.responseTime}ms` : 
                       page.error ? 'Error' : 
                       page.statusCode ? `${page.statusCode}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">📡 API Health</h3>
              <div className="space-y-3">
                {health.apis.map((api, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={api.status} />
                      <span className="text-[#e5e5e5]">{api.name}</span>
                    </div>
                    <div className="text-sm text-[#737373]">
                      {api.responseTime ? `${api.responseTime}ms` : 
                       api.error ? 'Error' : 
                       api.statusCode ? `${api.statusCode}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Failed Checks */}
          {(health.summary.failed > 0 || health.summary.errors > 0) && (
            <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-red-400 mb-4">🚨 Issues Detected</h3>
              <div className="space-y-2">
                {[...health.pages, ...health.apis]
                  .filter(check => check.status === 'fail' || check.status === 'error')
                  .map((check, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StatusIcon status={check.status} />
                      <div>
                        <div className="text-[#e5e5e5] font-medium">{check.name}</div>
                        <div className="text-sm text-red-400">
                          {check.error || `HTTP ${check.statusCode}`}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {health.overall !== 'healthy' && (
            <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">🔧 Recommended Actions</h3>
              <div className="space-y-2 text-sm text-[#e5e5e5]">
                {health.summary.failed > 0 && (
                  <div>• Fix failed endpoints to restore full functionality</div>
                )}
                {health.summary.errors > 0 && (
                  <div>• Investigate connection errors - may indicate server issues</div>
                )}
                {health.summary.avgResponseTime > 3000 && (
                  <div>• Optimize response times - currently slower than ideal</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}