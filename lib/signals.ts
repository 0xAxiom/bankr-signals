import { readFileSync, existsSync } from "fs";
import path from "path";

// Issue #20: Move trade-data.json out of /public into /data
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
  exitPrice?: number;
  exitTimestamp?: string;
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

// Issue #22: Normalize all keys to uppercase
const CHAINLINK_FEEDS: Record<string, { address: string; decimals: number }> = {
  ETH:   { address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", decimals: 8 },
  WETH:  { address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", decimals: 8 },
  BTC:   { address: "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E", decimals: 8 },
  WBTC:  { address: "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E", decimals: 8 },
  CBBTC: { address: "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E", decimals: 8 },
  LINK:  { address: "0x17CAb8FE31cA45e0a5a2Ed8b7101F8445BE8e289", decimals: 8 },
  AAVE:  { address: "0x6Ce185860a4963106506C203335A2910413708e9", decimals: 8 },
  SOL:   { address: "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D", decimals: 8 },
};

// Issue #22: Normalize all keys to uppercase
const BASE_TOKEN_ADDRESSES: Record<string, string> = {
  USDC:    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  USDBC:   "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
  DAI:     "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  DEGEN:   "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
  BRETT:   "0x532f27101965dd16442E59d40670FaF5eBB142E4",
  TOSHI:   "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
  HIGHER:  "0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe",
  AERO:    "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
  VIRTUAL: "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b",
  MORPHO:  "0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842",
  WELL:    "0xA88594D404727625A9437C3f886C7643872296AE",
  BNKR:    "0x22aF33FE49fD1Fa80c7149773dDe5BF0e26Eb48C",
  AXIOM:   "0xf3ce5ddaab6c133f9875a4a46c55cf0b58111b07",
};

const LATEST_ROUND_DATA_SIG = "0xfeaf968c";
const INFURA_RPC = `https://base-mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ""}`;

const priceCache: Map<string, { price: number; fetchedAt: number }> = new Map();
const CACHE_TTL = 60_000;

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

async function fetchDexScreenerPrice(tokenAddress: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { next: { revalidate: 60 } } as any
    );
    const data = await res.json();
    if (data.pairs && data.pairs.length > 0) {
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

async function fetchDexScreenerPriceBySymbol(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${symbol}%20base`,
      { next: { revalidate: 60 } } as any
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

async function getTokenPrice(symbol: string): Promise<number | null> {
  const upperSymbol = symbol.toUpperCase();

  if (["USDC", "USDT", "DAI", "USDBC"].includes(upperSymbol)) return 1.0;

  const cached = priceCache.get(upperSymbol);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.price;

  let price: number | null = null;

  const feed = CHAINLINK_FEEDS[upperSymbol];
  if (feed && process.env.INFURA_API_KEY) {
    price = await fetchChainlinkPrice(feed.address, feed.decimals, INFURA_RPC);
  }

  if (!price && BASE_TOKEN_ADDRESSES[upperSymbol]) {
    price = await fetchDexScreenerPrice(BASE_TOKEN_ADDRESSES[upperSymbol]);
  }

  if (!price) {
    price = await fetchDexScreenerPriceBySymbol(upperSymbol);
  }

  if (price && price > 0) {
    priceCache.set(upperSymbol, { price, fetchedAt: Date.now() });
  }

  return price;
}

async function fetchPrices(extraSymbols?: string[]): Promise<Record<string, number>> {
  const symbols = new Set<string>();
  for (const s of Object.keys(CHAINLINK_FEEDS)) symbols.add(s);
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
  // Issue #20: Read from data/ instead of public/
  const bundledPath = path.join(process.cwd(), "data", "trade-data.json");
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

// Issue #12: Broaden token extraction regex
function extractTokenFromText(text: string): string | null {
  // Match common token symbols: 2-10 uppercase letters, or known mixed-case tokens
  const match = text.match(/\b(eth|btc|sol|link|aave|weth|wbtc|cbbtc|degen|brett|toshi|higher|aero|virtual|morpho|well|bnkr|axiom|usdc|dai|arb|op|matic|avax|dot|ada|xrp|doge|shib|pepe|bonk|wif|jup|render|fet|near|sui|apt|sei|tia|stx|inj|ondo|pendle|ldo|rpl|mkr|uni|crv|snx|comp|grt|fil)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function extractTradesFromLog(entries: TradeEntry[]): ParsedTrade[] {
  const trades: ParsedTrade[] = [];

  for (const entry of entries) {
    if (!entry.prompt || !entry.response) continue;

    const prompt = entry.prompt.toLowerCase();
    const response = entry.response;
    const responseLower = response.toLowerCase();

    if (
      prompt.includes("show my") ||
      prompt.includes("what are my") ||
      prompt.includes("set a") ||
      prompt.includes("set stop") ||
      prompt.includes("close my") ||
      prompt.includes("balance")
    ) continue;

    if (
      responseLower.includes("how much collateral") ||
      responseLower.includes("how much usd") ||
      responseLower.includes("i need to know") ||
      responseLower.includes("i'd love to help") ||
      responseLower.includes("i'm ready to set")
    ) continue;

    let action: ParsedTrade["action"] | null = null;
    let token = "";

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

    // Issue #12: Use broader token extraction
    if (!token) {
      const extracted = extractTokenFromText(prompt);
      if (extracted) token = extracted;
    }
    if (!token) continue;

    if (token === "USDC") continue;

    let entryPrice = 0;
    let collateralUsd: number | undefined;
    let amountToken: number | undefined;

    const avantisEntryMatch = response.match(/entry\s*(?:price)?[:\s]*\$?([\d,]+\.?\d*)/i);
    if (avantisEntryMatch) {
      // Issue #21: Use global flag for comma removal
      entryPrice = parseFloat(avantisEntryMatch[1].replace(/,/g, ""));
    }

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

    if (!entryPrice) {
      const priceMatch = response.match(/(?:price|at)\s*[:\s]*\$?([\d,]+\.?\d*)/i);
      // Issue #21: Use global flag for comma removal
      if (priceMatch) entryPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
    }

    let leverage: number | undefined;
    const levMatch = prompt.match(/(\d+)x\s*leverage/i) || prompt.match(/(\d+)x/i) ||
      response.match(/leverage[:\s]*(\d+(?:\.\d+)?)x/i) || response.match(/(\d+(?:\.\d+)?)x/i);
    if (levMatch) leverage = parseFloat(levMatch[1]);

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

  // Issue #6: Rewrite trade pairing with proper open-by-token Map
  // Sort by timestamp first
  trades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const openByToken = new Map<string, ParsedTrade[]>();
  const paired: ParsedTrade[] = [];

  for (const trade of trades) {
    const isOpen = trade.action === "BUY" || trade.action === "LONG";
    const isClose = trade.action === "SELL" || trade.action === "SHORT";

    // Check if this is a close for an existing open position
    if (isClose) {
      const opens = openByToken.get(trade.token);
      if (opens && opens.length > 0) {
        // Close the oldest open position (FIFO)
        const openTrade = opens.shift()!;
        if (opens.length === 0) openByToken.delete(trade.token);

        if (openTrade.entryPrice > 0 && trade.entryPrice > 0) {
          let pnlPct: number;
          if (openTrade.action === "BUY" || openTrade.action === "LONG") {
            pnlPct = ((trade.entryPrice - openTrade.entryPrice) / openTrade.entryPrice) * 100;
          } else {
            pnlPct = ((openTrade.entryPrice - trade.entryPrice) / openTrade.entryPrice) * 100;
          }
          // Issue #6: Apply leverage multiplier
          if (openTrade.leverage) pnlPct *= openTrade.leverage;

          // Issue #10: Weight by collateral/notional value (store raw for weighted calc later)
          openTrade.pnl = pnlPct;
          openTrade.status = "closed";
          openTrade.exitPrice = trade.entryPrice;
          openTrade.exitTimestamp = trade.timestamp;
        }
        // Don't add the closing trade separately; info is on the open trade
        continue;
      }
    }

    // This is an open or an unmatched close
    if (isOpen) {
      const opens = openByToken.get(trade.token) || [];
      opens.push(trade);
      openByToken.set(trade.token, opens);
    }
    // Issue #7: Skip unmatched SELL — don't treat as synthetic short
    // Only add open (BUY/LONG) and matched SHORT trades
    if (isOpen) {
      paired.push(trade);
    }
    // Unmatched SELL/SHORT-close: skip entirely
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

// Issue #5: Load providers dynamically, support multiple
export async function getProviderStats(): Promise<ProviderStats[]> {
  const { getProviders, getProvider } = await import("@/lib/providers");
  const providers = getProviders();

  const entries = parseTradeLog();
  const trades = extractTradesFromLog(entries);
  const tradeTokens = trades.map(t => t.token).filter(Boolean);
  const prices = await fetchPrices(tradeTokens);

  // Calculate unrealized PnL for open trades
  for (const trade of trades) {
    if (trade.status !== "open") continue;

    const currentPrice = prices[trade.token];
    if (!currentPrice || !trade.entryPrice) continue;

    // Issue #7: Only calculate unrealized for BUY/LONG (price up) and SHORT (price down)
    let pnlPct = 0;
    if (trade.action === "BUY" || trade.action === "LONG") {
      pnlPct = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
    } else if (trade.action === "SHORT") {
      pnlPct = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
    } else {
      // SELL without a matched open — skip unrealized
      continue;
    }

    if (trade.leverage) pnlPct *= trade.leverage;
    trade.pnl = pnlPct;
  }

  // Build stats per provider. For now all trades map to known provider addresses.
  // If no providers registered, create a default entry for the hardcoded address.
  const providerAddresses = providers.length > 0
    ? providers.map(p => p.address.toLowerCase())
    : ["0xef2cc7d15d3421629f93ffa39727f14179f31c75"];

  const results: ProviderStats[] = [];

  for (const addr of providerAddresses) {
    // For now all trades belong to the first provider (single trade log)
    // When multi-provider trade logs exist, filter by provider address
    const providerTrades = trades;

    // Issue #11: Only count closed trades for win rate
    const closedTrades = providerTrades.filter(t => t.status === "closed" && t.pnl !== undefined);

    // Issue #10: Weight PnL by collateral/notional value
    let totalWeightedPnl = 0;
    let totalWeight = 0;
    let wins = 0;
    let losses = 0;
    let currentStreak = 0;

    for (const trade of closedTrades) {
      const weight = trade.collateralUsd || trade.amountToken || 1;
      totalWeightedPnl += (trade.pnl || 0) * weight;
      totalWeight += weight;

      if (trade.pnl! > 0) {
        wins++;
        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
      } else if (trade.pnl! < 0) {
        losses++;
        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
      }
    }

    // Also include unrealized in total PnL display
    let unrealizedPnl = 0;
    for (const trade of providerTrades) {
      if (trade.status === "open" && trade.pnl !== undefined) {
        const weight = trade.collateralUsd || trade.amountToken || 1;
        unrealizedPnl += trade.pnl * weight;
      }
    }

    const totalPnl = totalWeight > 0
      ? (totalWeightedPnl + unrealizedPnl) / totalWeight
      : 0;

    const totalClosed = wins + losses;
    const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
    const avgReturn = totalWeight > 0 && totalClosed > 0
      ? totalWeightedPnl / totalWeight / totalClosed * totalClosed
      : 0;

    const batchEntries = entries.filter((e) => e.pair);
    const signalCount = providerTrades.length + batchEntries.length;

    const lastTrade = providerTrades[providerTrades.length - 1];
    const lastSignalAge = lastTrade ? timeAgo(lastTrade.timestamp) : "never";

    const profile = getProvider(addr);

    results.push({
      address: addr,
      name: profile?.name || `${addr.slice(0, 8)}...${addr.slice(-6)}`,
      pnl_pct: Math.round(totalPnl * 10) / 10,
      win_rate: Math.round(winRate),
      signal_count: signalCount,
      subscriber_count: 0,
      avg_return: totalWeight > 0 && totalClosed > 0
        ? Math.round((totalWeightedPnl / totalWeight) * 10) / 10
        : 0,
      streak: currentStreak,
      last_signal_age: lastSignalAge,
      trades: providerTrades,
    });
  }

  return results;
}
