import { getProviders } from "@/lib/providers";
import { CompareProviders } from "./compare-providers";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  let providers: any[] = [];
  
  try {
    providers = await getProviders();
    // Only show providers with at least 1 signal
    providers = providers.filter(p => p.signalCount > 0);
  } catch (e) {
    console.error("Compare page error:", e);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold mb-1">Provider Comparison</h1>
        <p className="text-xs text-[#737373]">
          Compare signal providers side-by-side to find the best performers.
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-[#737373] mb-2">No providers with signals found</p>
          <a 
            href="/register" 
            className="text-xs text-[#22c55e] hover:underline"
          >
            Register as a provider
          </a>
        </div>
      ) : providers.length === 1 ? (
        <div className="text-center py-12">
          <p className="text-sm text-[#737373] mb-4">
            Only one provider has published signals so far. 
            <br />
            More providers needed for comparison.
          </p>
          <div className="space-y-2">
            <a 
              href="/register" 
              className="inline-block text-xs text-[#22c55e] hover:underline mr-4"
            >
              Register as a provider
            </a>
            <a 
              href={`/provider/${providers[0].address}`}
              className="inline-block text-xs text-[#e5e5e5] hover:underline"
            >
              View {providers[0].name}'s profile
            </a>
          </div>
        </div>
      ) : (
        <CompareProviders providers={providers} />
      )}
    </main>
  );
}