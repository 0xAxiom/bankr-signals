import { readFileSync, existsSync } from "fs";
import path from "path";

const TRADE_LOG = path.join(
  process.env.SIGNALS_DIR || "/Users/axiom/clawd/trading/signals",
  "trade_log.jsonl"
);

const SIGNAL_DIR =
  process.env.SIGNALS_DIR || "/Users/axiom/clawd/trading/signals";

export interface TradeEntry {
  timestamp: string;
  prompt: string;
  response: string;
  jobId?: string;
  processingTime?: number;
  txCount?: number;
  // Batch signal entries have different shape
  pairs_analyzed?: number;
  signals?: Record<string, any>;
  trades_executed?: string;
  reason?: string;
  open_position_update?: Record<string, any>;
}

export interface ParsedTrade {
  timestamp: string;
  action: "BUY" | "SELL" | "LONG" | "SHORT";
  token: string;
  entryPrice: number;
  leverage?: number;
  txHash?: string;
  pnl?: number;
  status: "open" | "closed" | "stopped";
}

export interface ProviderStats {
  address: string;
  name: string;
  pnl_pct: number;
  win_rate: number;
  signal_count: number;
  subscriber_count: number;
  avg_return: number;
  streak: number;
  last_signal_age: string;
  trades: ParsedTrade[];
}

const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  LINK: "chainlink",
  AAVE: "aave",
};

let priceCache: { prices: Record<string, number>; fetchedAt: number } = {
  prices: {},
  fetchedAt: 0,
};

async function fetchPrices(): Promise<Record<string, number>> {
  const now = Date.now();
  // Cache for 60 seconds
  if (now - priceCache.fetchedAt < 60_000 && Object.keys(priceCache.prices).length > 0) {
    return priceCache.prices;
  }

  try {
    const ids = Object.values(COINGECKO_IDS).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();

    const prices: Record<string, number> = {};
    for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
      if (data[id]?.usd) {
        prices[symbol] = data[id].usd;
      }
    }

    priceCache = { prices, fetchedAt: now };
    return prices;
  } catch {
    return priceCache.prices;
  }
}

function parseTradeLog(): TradeEntry[] {
  // Try local JSONL file first (dev/local), fall back to bundled JSON
  if (existsSync(TRADE_LOG)) {
    const raw = readFileSync(TRADE_LOG, "utf-8");
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as TradeEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is TradeEntry => e !== null);
  }

  // Vercel: read from bundled public/trade-data.json
  const bundledPath = path.join(process.cwd(), "public", "trade-data.json");
  if (existsSync(bundledPath)) {
    try {
      return JSON.parse(readFileSync(bundledPath, "utf-8")) as TradeEntry[];
    } catch {
      return [];
    }
  }

  return [];
}

function extractTxHash(text: string): string | undefined {
  const match = text.match(/0x[a-fA-F0-9]{64}/);
  return match?.[0];
}

function extractTradesFromLog(entries: TradeEntry[]): ParsedTrade[] {
  const trades: ParsedTrade[] = [];

  for (const entry of entries) {
    if (!entry.prompt || !entry.response) continue;

    const prompt = entry.prompt.toLowerCase();
    const response = entry.response.toLowerCase();

    // Skip position checks and balance queries
    if (
      prompt.includes("show my") ||
      prompt.includes("what are my") ||
      prompt.includes("set a") ||
      prompt.includes("set stop") ||
      prompt.includes("close my")
    )
      continue;

    // Detect buy/sell/long/short
    let action: ParsedTrade["action"] | null = null;
    let token = "";

    if (prompt.includes("buy")) {
      action = "BUY";
    } else if (prompt.includes("sell")) {
      action = "SELL";
    } else if (prompt.includes("long")) {
      action = "LONG";
    } else if (prompt.includes("short")) {
      action = "SHORT";
    }

    if (!action) continue;

    // Extract token
    const tokenMatch = prompt.match(/\b(eth|btc|sol|link|aave)\b/i);
    if (tokenMatch) token = tokenMatch[1].toUpperCase();
    if (!token) continue;

    // Extract entry price from response
    let entryPrice = 0;
    const priceMatch = entry.response.match(
      /(?:entry|price|at)\s*(?:price)?[:\s]*\$?([\d,]+\.?\d*)/i
    );
    if (priceMatch) entryPrice = parseFloat(priceMatch[1].replace(",", ""));

    // Extract leverage
    let leverage: number | undefined;
    const levMatch =
      prompt.match(/(\d+)x/i) || entry.response.match(/(\d+(?:\.\d+)?)x/i);
    if (levMatch) leverage = parseFloat(levMatch[1]);

    const txHash = extractTxHash(entry.response);

    trades.push({
      timestamp: entry.timestamp,
      action,
      token,
      entryPrice,
      leverage,
      txHash,
      status: "open", // Will be resolved with current prices
      pnl: undefined,
    });
  }

  return trades;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function getProviderStats(): Promise<ProviderStats[]> {
  const entries = parseTradeLog();
  const trades = extractTradesFromLog(entries);
  const prices = await fetchPrices();

  // Calculate PnL for each trade
  let totalPnl = 0;
  let wins = 0;
  let losses = 0;
  let totalReturn = 0;
  let currentStreak = 0;

  for (const trade of trades) {
    const currentPrice = prices[trade.token];
    if (!currentPrice || !trade.entryPrice) continue;

    let pnlPct = 0;
    if (trade.action === "BUY" || trade.action === "LONG") {
      pnlPct = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
    } else {
      pnlPct = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
    }

    if (trade.leverage) pnlPct *= trade.leverage;

    trade.pnl = pnlPct;
    totalPnl += pnlPct;
    totalReturn += pnlPct;

    if (pnlPct > 0) {
      wins++;
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
    } else if (pnlPct < 0) {
      losses++;
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
    }
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgReturn = totalTrades > 0 ? totalReturn / totalTrades : 0;

  // Count total signals from batch entries too
  const batchEntries = entries.filter((e) => e.pairs_analyzed);
  const signalCount = trades.length + batchEntries.length;

  const lastTrade = trades[trades.length - 1];
  const lastSignalAge = lastTrade ? timeAgo(lastTrade.timestamp) : "never";

  return [
    {
      address: "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5",
      name: "axiom.base.eth",
      pnl_pct: Math.round(totalPnl * 10) / 10,
      win_rate: Math.round(winRate),
      signal_count: signalCount,
      subscriber_count: 0,
      avg_return: Math.round(avgReturn * 10) / 10,
      streak: currentStreak,
      last_signal_age: lastSignalAge,
      trades,
    },
  ];
}
