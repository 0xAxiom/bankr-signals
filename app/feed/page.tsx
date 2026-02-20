import { getProviderStats } from "@/lib/signals";

export const dynamic = "force-dynamic";

export default async function Feed() {
  const providers = await getProviderStats();
  const trades = providers.flatMap((p) =>
    p.trades.map((t) => ({ ...t, providerName: p.name, providerAddress: p.address }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold mb-1">Signal Feed</h1>
      <p className="text-xs text-[#737373] mb-8">
        Live signals from all providers. Every signal has a verified TX hash.
      </p>

      <div className="space-y-3">
        {trades.length === 0 && (
          <p className="text-sm text-[#737373]">No trades yet.</p>
        )}
        {trades.map((t, i) => {
          const age = Math.floor(
            (Date.now() - new Date(t.timestamp).getTime()) / 60000
          );
          const ageStr =
            age < 60
              ? `${age}m`
              : age < 1440
                ? `${Math.floor(age / 60)}h`
                : `${Math.floor(age / 1440)}d`;
          const isBuy = t.action === "BUY" || t.action === "LONG";

          return (
            <div
              key={i}
              className="border border-[#2a2a2a] rounded-lg p-4 bg-[#1a1a1a] hover:bg-[#222] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      isBuy
                        ? "bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)]"
                        : "bg-[rgba(239,68,68,0.1)] text-[rgba(239,68,68,0.8)]"
                    }`}
                  >
                    {t.action}
                  </span>
                  <span className="font-mono font-semibold">{t.token}</span>
                  {t.leverage && (
                    <span className="text-xs text-[#737373]">
                      {t.leverage}x
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#737373]">
                  <span>{ageStr} ago</span>
                  <a
                    href={`/provider/${t.providerAddress}`}
                    className="hover:text-[#e5e5e5] font-mono"
                  >
                    {t.providerName}
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-[#737373]">Entry</div>
                  <div className="font-mono">
                    ${t.entryPrice ? t.entryPrice.toLocaleString() : "-"}
                  </div>
                </div>
                {t.pnl !== undefined && (
                  <div>
                    <div className="text-[#737373]">PnL</div>
                    <div
                      className={`font-mono ${
                        t.pnl >= 0
                          ? "text-[rgba(34,197,94,0.6)]"
                          : "text-[rgba(239,68,68,0.6)]"
                      }`}
                    >
                      {t.pnl >= 0 ? "+" : ""}
                      {t.pnl.toFixed(1)}%
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[#737373]">Status</div>
                  <div className="font-mono text-[#737373]">{t.status.toUpperCase()}</div>
                </div>
              </div>
              {t.txHash && (
                <div className="mt-3 text-xs font-mono text-[#737373]">
                  TX:{" "}
                  <a
                    href={`https://basescan.org/tx/${t.txHash}`}
                    target="_blank"
                    rel="noopener"
                    className="hover:text-[#e5e5e5] transition-colors"
                  >
                    {t.txHash.slice(0, 18)}…
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
