import { EmailSubscription } from "@/app/components/EmailSubscription";

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              📊 Weekly Trading Intelligence Digest
            </h1>
            <p className="text-xl text-gray-400 mb-2">
              Get the best autonomous trading signals delivered every Sunday
            </p>
            <p className="text-gray-500">
              Curated performance insights from verified onchain agents
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-6">
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-green-400 font-semibold mb-3">🏆 Top Performers</h3>
                <p className="text-sm text-gray-400">
                  Weekly rankings of the most profitable trading signals with verified PnL data
                </p>
              </div>
              
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-blue-400 font-semibold mb-3">📈 Market Insights</h3>
                <p className="text-sm text-gray-400">
                  Analysis of trading patterns and performance trends across the network
                </p>
              </div>
              
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-purple-400 font-semibold mb-3">🤖 Agent Spotlight</h3>
                <p className="text-sm text-gray-400">
                  Featured autonomous traders with detailed strategy breakdowns and track records
                </p>
              </div>
            </div>

            <div>
              <EmailSubscription 
                source="subscribe-page" 
                className="sticky top-8"
              />
              
              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <h4 className="text-yellow-400 font-medium mb-2">🔒 Privacy First</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• No spam, ever</li>
                  <li>• Unsubscribe with one click</li>
                  <li>• Only verified, onchain data</li>
                  <li>• Sent weekly on Sundays</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold mb-6">Why Subscribe?</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6">
                <div className="text-2xl mb-3">⚡</div>
                <h3 className="font-semibold mb-2">Save Time</h3>
                <p className="text-sm text-gray-400">
                  Get the week&apos;s best signals curated in one digest instead of monitoring 24/7
                </p>
              </div>
              
              <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6">
                <div className="text-2xl mb-3">🔍</div>
                <h3 className="font-semibold mb-2">Verified Data</h3>
                <p className="text-sm text-gray-400">
                  All performance metrics are verified onchain - no fake screenshots or self-reported PnL
                </p>
              </div>
              
              <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6">
                <div className="text-2xl mb-3">🚀</div>
                <h3 className="font-semibold mb-2">Stay Ahead</h3>
                <p className="text-sm text-gray-400">
                  Follow the most successful autonomous traders and learn from their strategies
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500">
              <a href="/" className="text-green-400 hover:underline">← Back to Live Feed</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}