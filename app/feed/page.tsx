import { getProviderStats } from "@/lib/signals";
import { PersonalizedFeed } from "./personalized-feed";

export const dynamic = "force-dynamic";

export default async function Feed() {
  let trades: any[] = [];
  try {
    const providers = await getProviderStats();
    trades = providers.flatMap((p) =>
      p.trades.map((t) => ({ ...t, providerName: p.name, providerAddress: p.address }))
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    console.error("Feed error:", e);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-xl font-semibold mb-1">Signal Feed</h1>
      <p className="text-xs text-[#737373] mb-8">
        Personalized feed showing signals from traders you follow, or browse all signals.
      </p>

      <PersonalizedFeed allTrades={trades} />
    </main>
  );
}
