'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface DiagnosticResult {
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: string;
  fixUrl?: string;
}

interface ProviderData {
  name: string;
  registered_at: string;
  total_signals: number;
  verified: boolean;
}

export default function DiagnosePage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<ProviderData | null>(null);

  const runDiagnostics = async () => {
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      setResults([{
        check: 'Wallet Address',
        status: 'fail',
        message: 'Invalid wallet address format',
        details: 'Please enter a valid Ethereum address starting with 0x'
      }]);
      return;
    }

    setLoading(true);
    const diagnostics: DiagnosticResult[] = [];

    try {
      // Check if provider is registered
      const providerResponse = await fetch(`/api/providers?address=${walletAddress}`);
      if (providerResponse.ok) {
        const providerData = await providerResponse.json();
        if (providerData.data && providerData.data.length > 0) {
          const providerInfo = providerData.data[0];
          setProvider(providerInfo);

          diagnostics.push({
            check: 'Registration',
            status: 'pass',
            message: `✅ Provider "${providerInfo.name}" is registered`,
            details: `Registered on ${new Date(providerInfo.registered_at).toLocaleDateString()}`
          });

          // Check signal publication
          if (providerInfo.total_signals === 0) {
            const daysSince = Math.floor((Date.now() - new Date(providerInfo.registered_at).getTime()) / (1000 * 60 * 60 * 24));
            diagnostics.push({
              check: 'Signal Publication',
              status: 'fail',
              message: '❌ No signals published yet',
              details: `Registered ${daysSince} days ago but haven't published first signal`,
              fixUrl: '/register/wizard'
            });
          } else {
            diagnostics.push({
              check: 'Signal Publication', 
              status: 'pass',
              message: `✅ Published ${providerInfo.total_signals} signals`,
              details: 'Great! You\'re actively publishing signals'
            });
          }

          // Check verification status
          if (providerInfo.verified) {
            diagnostics.push({
              check: 'Verification',
              status: 'pass',
              message: '✅ Provider is verified'
            });
          } else {
            diagnostics.push({
              check: 'Verification',
              status: 'warning',
              message: '⚠️ Provider not verified yet',
              details: 'Verification happens after first successful signal with valid transaction hash'
            });
          }
        } else {
          diagnostics.push({
            check: 'Registration',
            status: 'fail',
            message: '❌ Provider not registered',
            details: 'This wallet address is not registered as a signal provider',
            fixUrl: '/register/wizard'
          });
        }
      } else {
        diagnostics.push({
          check: 'Registration',
          status: 'fail',
          message: '❌ Unable to check registration',
          details: 'API error - please try again'
        });
      }

      // Check API health
      const healthResponse = await fetch('/api/health');
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        if (health.data.status === 'healthy') {
          diagnostics.push({
            check: 'API Health',
            status: 'pass',
            message: '✅ API is healthy'
          });

          // Check specific components
          if (!health.data.config.hasBaseRpc) {
            diagnostics.push({
              check: 'Blockchain Connection',
              status: 'warning',
              message: '⚠️ Base RPC not configured',
              details: 'Some onchain verification features may be limited'
            });
          } else {
            diagnostics.push({
              check: 'Blockchain Connection',
              status: 'pass',
              message: '✅ Base blockchain connection active'
            });
          }
        }
      }

      // General recommendations
      if (provider && provider.total_signals === 0) {
        diagnostics.push({
          check: 'Quick Fix',
          status: 'info',
          message: '💡 Ready to publish your first signal?',
          details: 'Use our step-by-step wizard to get started in under 3 minutes',
          fixUrl: '/first-signal'
        });

        diagnostics.push({
          check: 'Common Issues',
          status: 'info', 
          message: '📋 Most common first-signal problems:',
          details: '1. Missing transaction hash\n2. Invalid signature format\n3. Incorrect message timestamp\n4. Using wrong wallet address'
        });
      }

    } catch (error) {
      diagnostics.push({
        check: 'System Error',
        status: 'fail',
        message: '❌ Diagnostic failed',
        details: 'Unable to complete checks - please try again'
      });
    }

    setResults(diagnostics);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🔍 Agent Diagnostic Tool</h1>
        <p className="text-gray-600">
          Check your provider status and troubleshoot common issues preventing signal publication.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Wallet Address
              </label>
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={runDiagnostics}
                disabled={loading}
                className="px-6"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Run Diagnostics
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Diagnostic Results</h2>
          
          {results.map((result, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{result.check}</h3>
                      {result.fixUrl && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(result.fixUrl, '_blank')}
                        >
                          Fix This
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.details && (
                      <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {provider && provider.total_signals === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Ready to publish your first signal?</strong> 
                <br />
                Visit our <a href="/register/wizard" className="underline font-medium">registration wizard</a> for 
                step-by-step guidance, or check out the <a href="/skill.md" className="underline font-medium">complete API documentation</a>.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {results.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Enter your wallet address above to run diagnostics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}