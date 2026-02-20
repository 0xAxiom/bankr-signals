import { readFileSync, existsSync } from "fs";
import path from "path";

const TRADE_LOG = path.join(
  process.env.SIGNALS_DIR || "/Users/axiom/clawd/trading/signals",
  "trade_log.jsonl"
);

export interface TradeEntry {
  timestamp: string;
  prompt: string;
  response: string;
  jobId?: string;
  processingTime?: number;
  txCount?: number;
  pair?: string;
  signal?: string;
  confidence?: number;
  tier?: string;
  command?: string;
  result?: string;
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
  collateralUsd?: number;
  amountToken?: number;
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

// Chainlink Price Feed addresses on Base mainnet (fast, reliable for majors)
const CHAINLINK_FEEDS: Record<string, { address: string; decimals: number }> = {
  ETH:  { address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", decimals: 8 },
  WETH: { address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", decimals: 8 },
  BTC:  { address: "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E", decimals: 8 },
  WBTC: { address: "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E", decimals: 8 },
  cbBTC:{ address: "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E", decimals: 8 },
  LINK: { address: "0x17CAb8FE31cA45e0a5a2Ed8b7101F8445BE8e289", decimals: 8 },
  AAVE: { address: "0x6Ce185860a4963106506C203335A2910413708e9", decimals: 8 },
  SOL:  { address: "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D", decimals: 8 },
};

// Well-known Base token addresses for DexScreener lookups
const BASE_TOKEN_ADDRESSES: Record<string, string> = {
  USDC:   "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  USDbC:  "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
  DAI:    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  DEGEN:  "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
  BRETT:  "0x532f27101965dd16442E59d40670FaF5eBB142E4",
  TOSHI:  "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
  HIGHER: "0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe",
  AERO:   "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
  VIRTUAL:"0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b",
  MORPHO: "0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842",
  WELL:   "0xA88594D404727625A9437C3f886C7643872296AE",
  BNKR:   "0x22aF33FE49fD1Fa80c7149773dDe5BF0e26Eb48C",
  AXIOM:  "0xf3ce5ddaab6c133f9875a4a46c55cf0b58111b07",
};

const LATEST_ROUND_DATA_SIG = "0xfeaf968c";
const INFURA_RPC = `https://base-mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ""}`;

// Cache: symbol -> { price, fetchedAt }
const priceCache: Map<string, { price: number; fetchedAt: number }> = new Map();
const CACHE_TTL = 60_000; // 1 minute

async function fetchChainlinkPrice(
  feedAddress: string,
  decimals: number,
  rpcUrl: string
): Promise<number | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: feedAddress, data: LATEST_ROUND_DATA_SIG }, "latest"],
        id: 1,
      }),
    });
    const data = await res.json();
    if (!data.result || data.result === "0x") return null;
    const hex = data.result.slice(2);
    const answerHex = hex.slice(64, 128);
    const answer = BigInt("0x" + answerHex);
    return Number(answer) / Math.pow(10, decimals);
  } catch {
    return null;
  }
}

// DexScreener: free, no API key, supports ANY token on Base
async function fetchDexScreenerPrice(tokenAddress: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    if (data.pairs && data.pairs.length > 0) {
      // Pick the pair with highest liquidity on Base
      const basePairs = data.pairs.filter((p: any) => p.chainId === "base");
      const best = (basePairs.length > 0 ? basePairs : data.pairs)
        .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      return parseFloat(best.priceUsd);
    }
    return null;
  } catch {
    return null;
  }
}

// DexScreener search by symbol (fallback when no known address)
async function fetchDexScreenerPriceBySymbol(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${symbol}%20base`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    if (data.pairs && data.pairs.length > 0) {
      const basePairs = data.pairs.filter(
        (p: any) => p.chainId === "base" && p.baseToken.symbol.toUpperCase() === symbol.toUpperCase()
      );
      if (basePairs.length > 0) {
        const best = basePairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        return parseFloat(best.priceUsd);
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Get price for a single token - tries Chainlink first, then DexScreener
async function getTokenPrice(symbol: string): Promise<number | null> {
  const upperSymbol = symbol.toUpperCase();

  // Stablecoins
  if (["USDC", "USDT", "DAI", "USDbC"].includes(upperSymbol)) return 1.0;

  // Check cache
  const cached = priceCache.get(upperSymbol);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.price;

  let price: number | null = null;

  // Try Chainlink first (fast, reliable for majors)
  const feed = CHAINLINK_FEEDS[upperSymbol];
  if (feed && process.env.INFURA_API_KEY) {
    price = await fetchChainlinkPrice(feed.address, feed.decimals, INFURA_RPC);
  }

  // Try DexScreener by known address
  if (!price && BASE_TOKEN_ADDRESSES[upperSymbol]) {
    price = await fetchDexScreenerPrice(BASE_TOKEN_ADDRESSES[upperSymbol]);
  }

  // Try DexScreener search by symbol
  if (!price) {
    price = await fetchDexScreenerPriceBySymbol(upperSymbol);
  }

  if (price && price > 0) {
    priceCache.set(upperSymbol, { price, fetchedAt: Date.now() });
  }

  return price;
}

// Fetch prices for a set of token symbols
async function fetchPrices(extraSymbols?: string[]): Promise<Record<string, number>> {
  const symbols = new Set<string>();
  // Always include majors
  for (const s of Object.keys(CHAINLINK_FEEDS)) symbols.add(s);
  // Add any extra tokens requested
  if (extraSymbols) {
    for (const s of extraSymbols) symbols.add(s.toUpperCase());
  }

  const prices: Record<string, number> = {};
  const results = await Promise.allSettled(
    Array.from(symbols).map(async (sym) => {
      const price = await getTokenPrice(sym);
      return [sym, price] as const;
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const [sym, price] = result.value;
      if (price && price > 0) prices[sym] = price;
    }
  }

  return prices;
}

function parseTradeLog(): TradeEntry[] {
  // Try local JSONL first, fall back to bundled JSON
  if (existsSync(TRADE_LOG)) {
    const raw = readFileSync(TRADE_LOG, "utf-8");
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try { return JSON.parse(line) as TradeEntry; }
        catch { return null; }
      })
      .filter((e): e is TradeEntry => e !== null);
  }
  const bundledPath = path.join(process.cwd(), "public", "trade-data.json");
  if (existsSync(bundledPath)) {
    try { return JSON.parse(readFileSync(bundledPath, "utf-8")) as TradeEntry[]; }
    catch { return []; }
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
    const response = entry.response;
    const responseLower = response.toLowerCase();

    // Skip non-trade entries
    if (
      prompt.includes("show my") ||
      prompt.includes("what are my") ||
      prompt.includes("set a") ||
      prompt.includes("set stop") ||
      prompt.includes("close my") ||
      prompt.includes("balance")
    ) continue;

    // Skip failed/incomplete trades (Bankr asking for more info)
    if (
      responseLower.includes("how much collateral") ||
      responseLower.includes("how much usd") ||
      responseLower.includes("i need to know") ||
      responseLower.includes("i'd love to help") ||
      responseLower.includes("i'm ready to set")
    ) continue;

    // Detect action
    let action: ParsedTrade["action"] | null = null;
    let token = "";

    // Leveraged positions (Avantis)
    const longMatch = prompt.match(/long\s+(\w+)\/usd/i);
    const shortMatch = prompt.match(/short\s+(\w+)\/usd/i);

    if (longMatch) {
      action = "LONG";
      token = longMatch[1].toUpperCase();
    } else if (shortMatch) {
      action = "SHORT";
      token = shortMatch[1].toUpperCase();
    } else if (prompt.includes("buy")) {
      action = "BUY";
    } else if (prompt.includes("sell")) {
      // "sell 100 USDC for AAVE" = BUY AAVE (spending USDC to get AAVE)
      // "sell all my AAVE for USDC" = SELL AAVE
      const sellForMatch = prompt.match(/sell\s+[\d.]+\s+usdc\s+for\s+(\w+)/i);
      const sellTokenMatch = prompt.match(/sell\s+(?:all\s+)?(?:my\s+)?(\w+)\s+for\s+usdc/i);
      if (sellForMatch) {
        action = "BUY";
        token = sellForMatch[1].toUpperCase();
      } else if (sellTokenMatch) {
        action = "SELL";
        token = sellTokenMatch[1].toUpperCase();
      } else {
        action = "SELL";
      }
    }

    if (!action) continue;

    // Extract token if not already set
    if (!token) {
      const tokenMatch = prompt.match(/\b(eth|btc|sol|link|aave)\b/i);
      if (tokenMatch) token = tokenMatch[1].toUpperCase();
    }
    if (!token) continue;

    // Skip USDC (not a tradeable asset in this context)
    if (token === "USDC") continue;

    // Extract entry price from response
    let entryPrice = 0;
    let collateralUsd: number | undefined;
    let amountToken: number | undefined;

    // Avantis leveraged: look for entry price in position details
    const avantisEntryMatch = response.match(/entry\s*(?:price)?[:\s]*\$?([\d,]+\.?\d*)/i);
    if (avantisEntryMatch) {
      entryPrice = parseFloat(avantisEntryMatch[1].replace(",", ""));
    }

    // Spot swap: "swapped X USDC for Y TOKEN" - calculate price from amounts
    const swapBuyMatch = response.match(/swapped\s+([\d.]+)\s+usdc\s+for\s+([\d.]+)\s+(\w+)/i);
    const swapSellMatch = response.match(/swapped\s+([\d.]+)\s+(\w+)\s+for\s+([\d.]+)\s+usdc/i);

    if (swapBuyMatch && !entryPrice) {
      const usdcAmount = parseFloat(swapBuyMatch[1]);
      const tokenAmount = parseFloat(swapBuyMatch[2]);
      if (tokenAmount > 0) {
        entryPrice = usdcAmount / tokenAmount;
        collateralUsd = usdcAmount;
        amountToken = tokenAmount;
      }
    } else if (swapSellMatch && !entryPrice) {
      const tokenAmount = parseFloat(swapSellMatch[1]);
      const usdcAmount = parseFloat(swapSellMatch[3]);
      if (tokenAmount > 0) {
        entryPrice = usdcAmount / tokenAmount;
        collateralUsd = usdcAmount;
        amountToken = tokenAmount;
      }
    }

    // Fallback: generic price pattern
    if (!entryPrice) {
      const priceMatch = response.match(/(?:price|at)\s*[:\s]*\$?([\d,]+\.?\d*)/i);
      if (priceMatch) entryPrice = parseFloat(priceMatch[1].replace(",", ""));
    }

    // Extract leverage
    let leverage: number | undefined;
    const levMatch = prompt.match(/(\d+)x\s*leverage/i) || prompt.match(/(\d+)x/i) ||
      response.match(/leverage[:\s]*(\d+(?:\.\d+)?)x/i) || response.match(/(\d+(?:\.\d+)?)x/i);
    if (levMatch) leverage = parseFloat(levMatch[1]);

    // Extract collateral for leveraged trades
    if (!collateralUsd) {
      const collMatch = prompt.match(/using\s+(\d+(?:\.\d+)?)\s*usdc/i) ||
        response.match(/collateral[:\s]*([\d.]+)\s*usdc/i);
      if (collMatch) collateralUsd = parseFloat(collMatch[1]);
    }

    const txHash = extractTxHash(response);

    trades.push({
      timestamp: entry.timestamp,
      action,
      token,
      entryPrice,
      leverage,
      txHash,
      status: "open",
      pnl: undefined,
      collateralUsd,
      amountToken,
    });
  }

  // Deduplicate: if we see a BUY then SELL of same token close together, pair them
  const paired: ParsedTrade[] = [];
  const used = new Set<number>();

  for (let i = 0; i < trades.length; i++) {
    if (used.has(i)) continue;
    const t = trades[i];

    // Look for a closing trade (opposite action, same token)
    if (t.action === "BUY") {
      for (let j = i + 1; j < trades.length; j++) {
        if (used.has(j)) continue;
        if (trades[j].token === t.token && trades[j].action === "SELL") {
          // This is a round-trip trade - compute realized PnL
          const exitPrice = trades[j].entryPrice;
          if (t.entryPrice > 0 && exitPrice > 0) {
            t.pnl = ((exitPrice - t.entryPrice) / t.entryPrice) * 100;
            t.status = "closed";
          }
          used.add(j);
          break;
        }
      }
    }
    paired.push(t);
  }

  return paired;
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
  const tradeTokens = trades.map(t => t.token).filter(Boolean);
  const prices = await fetchPrices(tradeTokens);

  let totalPnl = 0;
  let wins = 0;
  let losses = 0;
  let totalReturn = 0;
  let currentStreak = 0;

  for (const trade of trades) {
    // Closed trades already have PnL calculated
    if (trade.status === "closed" && trade.pnl !== undefined) {
      totalPnl += trade.pnl;
      totalReturn += trade.pnl;
      if (trade.pnl > 0) { wins++; currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1; }
      else if (trade.pnl < 0) { losses++; currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1; }
      continue;
    }

    // Open trades: calculate unrealized PnL
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

    if (pnlPct > 0) { wins++; currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1; }
    else if (pnlPct < 0) { losses++; currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1; }
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgReturn = totalTrades > 0 ? totalReturn / totalTrades : 0;

  // Count batch signal entries too
  const batchEntries = entries.filter((e) => e.pair);
  const signalCount = trades.length + batchEntries.length;

  const lastTrade = trades[trades.length - 1];
  const lastSignalAge = lastTrade ? timeAgo(lastTrade.timestamp) : "never";

  // Pull name from registered provider profile
  const { getProvider } = await import("@/lib/providers");
  const profile = getProvider("0xef2cc7d15d3421629f93ffa39727f14179f31c75");

  return [
    {
      address: "0xef2cc7d15d3421629f93ffa39727f14179f31c75",
      name: profile?.name || "0xef2cc7...f31c75",
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
