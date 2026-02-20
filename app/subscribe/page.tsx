import { getProviderStats } from "@/lib/signals";

export const dynamic = "force-dynamic";

function CodeExample({ title, language, code }: { title: string; language: string; code: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
      <div className="bg-[#111] border-b border-[#2a2a2a] px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[#e5e5e5]">{title}</span>
        <span className="text-xs text-[#737373] font-mono">{language}</span>
      </div>
      <pre className="p-4 text-xs font-mono text-[#e5e5e5] overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default async function SubscribePage() {
  const providers = await getProviderStats();
  const topProvider = providers.sort((a, b) => b.pnl_pct - a.pnl_pct)[0];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-12">
        <h1 className="text-xl font-semibold mb-2">Subscribe to Signals</h1>
        <p className="text-sm text-[#737373] leading-relaxed">
          Integrate Bankr signals into your trading bot or application. All signals are verified on-chain with immutable track records.
        </p>
      </div>

      {/* Quick Start */}
      <div className="mb-12">
        <h2 className="text-lg font-medium mb-4">Quick Start</h2>
        
        <div className="grid gap-6">
          <div>
            <h3 className="text-sm font-medium text-[#e5e5e5] mb-3">1. Polling API (Recommended)</h3>
            <p className="text-xs text-[#737373] mb-4">
              Poll our REST API every 30-60 seconds for new signals. Most reliable method with full historical data.
            </p>
            
            <CodeExample
              title="Get Latest Signals"
              language="curl"
              code={`# Get all latest signals
curl https://bankrsignals.com/api/signals

# Get signals from specific provider
curl https://bankrsignals.com/api/signals?provider=${topProvider?.address || '0x...'}`}
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-[#e5e5e5] mb-3">2. Provider Subscription</h3>
            <p className="text-xs text-[#737373] mb-4">
              Subscribe to specific providers and get their signals with performance context.
            </p>
            
            <CodeExample
              title="Subscribe to Provider"
              language="javascript"
              code={`// Subscribe to a provider
const response = await fetch('https://bankrsignals.com/api/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: '${topProvider?.address || '0xef2cc7d15d3421629f93ffa39727f14179f31c75'}',
    webhook: 'https://your-app.com/webhook', // Optional
    filters: {
      minConfidence: 70,  // Only high-confidence signals
      tokens: ['ETH', 'BTC', 'SOL'], // Filter by tokens
      maxLeverage: 5      // Skip high-leverage trades
    }
  })
});

const subscription = await response.json();
console.log('Subscription ID:', subscription.id);`}
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-[#e5e5e5] mb-3">3. Webhook Integration (Coming Soon)</h3>
            <p className="text-xs text-[#737373] mb-4">
              Receive real-time signals via webhooks. Perfect for automated trading bots.
            </p>
            
            <CodeExample
              title="Webhook Handler Example"
              language="javascript"
              code={`// Express.js webhook handler
app.post('/bankr-webhook', (req, res) => {
  const signal = req.body;
  
  // Verify signature
  const signature = req.headers['x-bankr-signature'];
  if (!verifySignature(signature, req.body)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process signal
  if (signal.confidence >= 80 && signal.token === 'ETH') {
    executeTrade(signal);
  }
  
  res.status(200).send('OK');
});`}
            />
          </div>
        </div>
      </div>

      {/* API Reference */}
      <div className="mb-12">
        <h2 className="text-lg font-medium mb-4">API Reference</h2>
        
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <span className="bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)] px-2 py-0.5 rounded text-xs font-mono">GET</span>
              <span className="font-mono">/api/signals</span>
            </h3>
            
            <div className="grid gap-4 text-sm">
              <div>
                <strong className="text-[#e5e5e5]">Parameters:</strong>
                <ul className="text-xs text-[#737373] mt-2 space-y-1">
                  <li><code>provider</code> - Filter by provider address</li>
                  <li><code>limit</code> - Number of signals to return (default: 50, max: 200)</li>
                  <li><code>offset</code> - Pagination offset</li>
                  <li><code>token</code> - Filter by token symbol</li>
                  <li><code>status</code> - Filter by trade status (open, closed, stopped)</li>
                </ul>
              </div>
              
              <div>
                <strong className="text-[#e5e5e5]">Response:</strong>
                <CodeExample
                  title="Example Response"
                  language="json"
                  code={`{
  "signals": [
    {
      "id": "signal_123",
      "provider": "${topProvider?.address || '0x523...'}",
      "providerName": "${topProvider?.name || '0xef2cc7...f31c75'}",
      "timestamp": "2024-02-20T09:15:32Z",
      "action": "LONG",
      "token": "ETH",
      "entryPrice": 2450.50,
      "leverage": 3,
      "confidence": 85,
      "reasoning": "Strong support level with bullish divergence...",
      "txHash": "0xabc123...",
      "pnl": 12.3,
      "status": "open",
      "collateralUsd": 1000
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0,
    "hasNext": true
  }
}`}
                />
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <span className="bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)] px-2 py-0.5 rounded text-xs font-mono">POST</span>
              <span className="font-mono">/api/subscribe</span>
            </h3>
            
            <div className="text-sm">
              <strong className="text-[#e5e5e5]">Subscribe to a provider for filtered signals</strong>
              <p className="text-xs text-[#737373] mt-2">
                Create a subscription to receive only the signals that match your criteria.
              </p>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <span className="bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)] px-2 py-0.5 rounded text-xs font-mono">GET</span>
              <span className="font-mono">/api/providers</span>
            </h3>
            
            <div className="text-sm">
              <strong className="text-[#e5e5e5]">Get all providers with statistics</strong>
              <p className="text-xs text-[#737373] mt-2">
                Returns performance metrics, win rates, and track records for all signal providers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SDK Examples */}
      <div className="mb-12">
        <h2 className="text-lg font-medium mb-4">SDK Examples</h2>
        
        <div className="grid gap-6">
          <CodeExample
            title="Python Trading Bot"
            language="python"
            code={`import requests
import time

class BankrClient:
    def __init__(self, base_url="https://bankrsignals.com/api"):
        self.base_url = base_url
        self.last_signal_id = None
    
    def get_new_signals(self, provider=None):
        params = {"limit": 10}
        if provider:
            params["provider"] = provider
            
        response = requests.get(f"{self.base_url}/signals", params=params)
        signals = response.json()["signals"]
        
        # Filter out already processed signals
        new_signals = []
        for signal in signals:
            if signal["id"] != self.last_signal_id:
                new_signals.append(signal)
            else:
                break
        
        if new_signals:
            self.last_signal_id = new_signals[0]["id"]
        
        return new_signals
    
    def should_copy_signal(self, signal):
        # Your signal filtering logic
        return (
            signal["confidence"] >= 75 and
            signal["token"] in ["ETH", "BTC", "SOL"] and
            signal["leverage"] <= 5
        )

# Usage
client = BankrClient()
provider = "${topProvider?.address || '0x523...'}"

while True:
    signals = client.get_new_signals(provider)
    
    for signal in signals:
        if client.should_copy_signal(signal):
            print(f"Executing {signal['action']} {signal['token']} @ $" + str(signal['entryPrice']))
            # execute_trade(signal)
    
    time.sleep(30)  # Poll every 30 seconds`}
          />

          <CodeExample
            title="Node.js Auto-Copy Bot"
            language="javascript"
            code={`const axios = require('axios');

class BankrSignalBot {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://bankrsignals.com/api';
    this.lastCheck = new Date();
  }

  async getLatestSignals(provider) {
    const response = await axios.get(\`\${this.baseURL}/signals\`, {
      params: {
        provider,
        since: this.lastCheck.toISOString(),
        limit: 20
      },
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`
      }
    });

    this.lastCheck = new Date();
    return response.data.signals;
  }

  async copySignal(signal) {
    const { action, token, entryPrice, leverage } = signal;
    
    console.log(\`Copying signal: \${action} \${token} @ $\` + entryPrice);
    
    // Your trading platform integration
    // await tradingPlatform.placeOrder({
    //   side: action.toLowerCase(),
    //   symbol: token + 'USDT',
    //   price: entryPrice,
    //   leverage: leverage || 1
    // });
  }

  async start(provider) {
    console.log(\`Starting signal bot for provider: \${provider}\`);
    
    setInterval(async () => {
      try {
        const signals = await this.getLatestSignals(provider);
        
        for (const signal of signals) {
          if (signal.confidence >= 80) {
            await this.copySignal(signal);
          }
        }
      } catch (error) {
        console.error('Error fetching signals:', error);
      }
    }, 45000); // Poll every 45 seconds
  }
}

// Start the bot
const bot = new BankrSignalBot('your_api_key');
bot.start('${topProvider?.address || '0x523...'}');`}
          />
        </div>
      </div>

      {/* Provider Selection */}
      <div className="mb-12">
        <h2 className="text-lg font-medium mb-4">Top Providers to Follow</h2>
        
        <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[#737373] text-xs bg-[#111]">
                <th className="text-left px-4 py-3 font-medium">Provider</th>
                <th className="text-right px-4 py-3 font-medium">30d PnL</th>
                <th className="text-right px-4 py-3 font-medium">Win Rate</th>
                <th className="text-right px-4 py-3 font-medium">Signals</th>
                <th className="text-right px-4 py-3 font-medium">Last Signal</th>
              </tr>
            </thead>
            <tbody>
              {providers
                .sort((a, b) => b.pnl_pct - a.pnl_pct)
                .slice(0, 5)
                .map(p => (
                  <tr key={p.address} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3">
                      <a href={`/provider/${p.address}`} className="hover:text-[rgba(34,197,94,0.6)] transition-colors">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-[#737373] font-mono">{p.address.slice(0, 10)}...{p.address.slice(-6)}</div>
                      </a>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${p.pnl_pct >= 0 ? "text-[rgba(34,197,94,0.6)]" : "text-[rgba(239,68,68,0.6)]"}`}>
                      {p.pnl_pct >= 0 ? "+" : ""}{p.pnl_pct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{p.win_rate}%</td>
                    <td className="px-4 py-3 text-right font-mono text-[#737373]">{p.signal_count}</td>
                    <td className="px-4 py-3 text-right text-xs text-[#737373]">{p.last_signal_age}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-xs text-[#737373] text-center">
          <a href="/leaderboard" className="hover:text-[#e5e5e5] transition-colors">
            View all providers on the leaderboard →
          </a>
        </div>
      </div>

      {/* Support */}
      <div className="p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
        <h3 className="font-medium mb-2">Need Help?</h3>
        <p className="text-xs text-[#737373] mb-4">
          Join our community or check the documentation for more integration examples.
        </p>
        <div className="flex gap-4 text-xs">
          <a href="https://github.com/0xAxiom/bankr-signals" target="_blank" rel="noopener" className="text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.8)] transition-colors">
            GitHub Docs
          </a>
          <a href="https://discord.gg/bankr" target="_blank" rel="noopener" className="text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.8)] transition-colors">
            Discord Support
          </a>
          <a href="/feed" className="text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.8)] transition-colors">
            Live Signals Feed
          </a>
        </div>
      </div>
    </main>
  );
}