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

// Chainlink Price Feed addresses on Base mainnet
// AggregatorV3Interface: latestRoundData() returns (roundId, answer, startedAt, updatedAt, answeredInRound)
const CHAINLINK_FEEDS: Record<string, { address: string; decimals: number }> = {
  ETH:  { address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", decimals: 8 },
  BTC:  { address: "0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E", decimals: 8 },
  LINK: { address: "0x17CAb8FE31cA45e0a5a2Ed8b7101F8445BE8e289", decimals: 8 },
  AAVE: { address: "0x6Ce185860a4963106506C203335A2910413708e9", decimals: 8 },
  SOL:  { address: "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D", decimals: 8 },
};

// latestRoundData() selector
const LATEST_ROUND_DATA_SIG = "0xfeaf968c";

const INFURA_RPC = `https://base-mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ""}`;

let priceCache: { prices: Record<string, number>; fetchedAt: number } = {
  prices: {},
  fetchedAt: 0,
};

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
    // latestRoundData returns 5 uint256s, answer is at offset 32 (2nd value)
    const hex = data.result.slice(2); // remove 0x
    const answerHex = hex.slice(64, 128); // 2nd 32-byte word
    const answer = BigInt("0x" + answerHex);
    return Number(answer) / Math.pow(10, decimals);
  } catch {
    return null;
  }
}

async function fetchPrices(): Promise<Record<string, number>> {
  const now = Date.now();
  if (now - priceCache.fetchedAt < 60_000 && Object.keys(priceCache.prices).length > 0) {
    return priceCache.prices;
  }

  const rpcUrl = INFURA_RPC;
  if (!process.env.INFURA_API_KEY) {
    // Fallback: try CoinGecko if no Infura key configured
    return fetchPricesCoinGecko();
  }

  try {
    const entries = Object.entries(CHAINLINK_FEEDS);
    const results = await Promise.all(
      entries.map(([symbol, feed]) =>
        fetchChainlinkPrice(feed.address, feed.decimals, rpcUrl).then((price) => [symbol, price] as const)
      )
    );

    const prices: Record<string, number> = {};
    for (const [symbol, price] of results) {
      if (price && price > 0) prices[symbol] = price;
    }

    if (Object.keys(prices).length > 0) {
      priceCache = { prices, fetchedAt: now };
      return prices;
    }

    // If all Chainlink calls failed, fall back to CoinGecko
    return fetchPricesCoinGecko();
  } catch {
    return fetchPricesCoinGecko();
  }
}

// CoinGecko fallback (rate-limited, used only when Infura unavailable)
async function fetchPricesCoinGecko(): Promise<Record<string, number>> {
  const now = Date.now();
  if (now - priceCache.fetchedAt < 60_000 && Object.keys(priceCache.prices).length > 0) {
    return priceCache.prices;
  }
  try {
    const ids = "ethereum,bitcoin,solana,chainlink,aave";
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    const map: Record<string, string> = { ETH: "ethereum", BTC: "bitcoin", SOL: "solana", LINK: "chainlink", AAVE: "aave" };
    const prices: Record<string, number> = {};
    for (const [symbol, id] of Object.entries(map)) {
      if (data[id]?.usd) prices[symbol] = data[id].usd;
    }
    priceCache = { prices, fetchedAt: now };
    return prices;
  } catch {
    return priceCache.prices;
  }
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
  const prices = await fetchPrices();

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

  return [
    {
      address: "0xef2cc7d15d3421629f93ffa39727f14179f31c75",
      name: "0xef2cc7...f31c75",
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
