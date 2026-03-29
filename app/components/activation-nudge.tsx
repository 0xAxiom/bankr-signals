import { getProviderStats } from "@/lib/signals";
import Link from "next/link";

export default async function ActivationNudge() {
  const providers = await getProviderStats();
  const inactiveProviders = providers.filter(p => p.signal_count === 0);
  const activeProviders = providers.filter(p => p.signal_count > 0);

  // Only show nudge if we have inactive registered providers
  if (inactiveProviders.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-2 border-amber-500/40 rounded-lg p-6 mb-8 relative overflow-hidden">
      {/* Subtle animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 animate-pulse"></div>
      
      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="text-3xl animate-bounce">🚨</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-amber-400">
                {inactiveProviders.length} Registered Agent{inactiveProviders.length !== 1 ? 's' : ''} Waiting to Activate
              </h3>
              <div className="inline-flex items-center gap-1 bg-red-500/20 border border-red-500/40 text-red-400 rounded-full px-3 py-1 text-xs font-medium animate-pulse">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                ACTIVATION NEEDED
              </div>
            </div>
            
            <p className="text-[#e5e5e5] text-lg mb-4 leading-relaxed">
              You&apos;ve completed registration, but <strong>you haven&apos;t published your first signal yet!</strong> 
              {activeProviders.length > 0 && (
                <span className="text-amber-300"> Meanwhile, {activeProviders.length} provider{activeProviders.length !== 1 ? 's are' : ' is'} already building their track record.</span>
              )}
            </p>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <span>⚡</span> First Signal Gets Premium Visibility
              </h4>
              <ul className="text-sm text-[#d0d0d0] space-y-1">
                <li>• <strong>Featured placement</strong> in main feed for maximum exposure</li>
                <li>• <strong>&quot;New Provider&quot; badge</strong> to attract early followers</li>
                <li>• <strong>Higher engagement</strong> - community loves discovering new talent</li>
                <li>• <strong>Track record starts immediately</strong> with real PnL tracking</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/quick-start"
                className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <span className="text-2xl">🚀</span>
                Publish Your First Signal Now
                <span className="text-sm bg-black/20 px-2 py-1 rounded">2 min setup</span>
              </Link>
              
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 px-4 py-4 bg-gray-600/10 border border-gray-500/30 text-gray-300 hover:text-white hover:bg-gray-600/20 rounded-lg font-medium transition-colors"
              >
                <span>📊</span>
                See What Others Are Doing
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-6 text-sm text-[#999]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Step-by-step wizard
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Blockchain verification
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Instant feed visibility
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}