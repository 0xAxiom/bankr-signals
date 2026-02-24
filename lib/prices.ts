/**
 * Real-time price fetching for live PnL tracking.
 * Uses CoinGecko free API with fallback.
 */

// Enhanced token symbol -> CoinGecko ID mapping
const TOKEN_IDS: Record<string, string> = {
  // Major cryptocurrencies
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  ATOM: "cosmos",
  NEAR: "near",
  ICP: "internet-computer",
  
  // Layer 2 & Scaling
  MATIC: "matic-network",
  ARB: "arbitrum",
  OP: "optimism",
  LRC: "loopring",
  METIS: "metis-andromeda",
  
  // DeFi tokens
  UNI: "uniswap",
  LINK: "chainlink",
  AAVE: "aave",
  SNX: "havven",
  COMP: "compound-governance-token",
  MKR: "maker",
  CRV: "curve-dao-token",
  BAL: "balancer",
  SUSHI: "sushi",
  "1INCH": "1inch",
  
  // Meme/Community tokens
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  BONK: "bonk",
  FLOKI: "floki",
  
  // Exchange tokens
  BNB: "binancecoin",
  CRO: "crypto-com-chain",
  FTT: "ftx-token",
  KCS: "kucoin-shares",
  
  // Stablecoins
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  FRAX: "frax",
  LUSD: "liquity-usd",
  
  // AI/Gaming tokens
  FET: "fetch-ai",
  RNDR: "render-token",
  THETA: "theta-network",
  ENJ: "enjincoin",
  SAND: "the-sandbox",
  MANA: "decentraland",
  
  // Additional popular tokens
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  XRP: "ripple",
  TRX: "tron",
  VET: "vechain",
  ALGO: "algorand",
  XTZ: "tezos",
  HBAR: "hedera-hashgraph",
  
  // Base ecosystem tokens
  BRETT: "based-brett", // Example Base meme token
  TOSHI: "toshi", // Another Base token
};

interface PriceData {
  price: number;
  change24h: number;
  timestamp: number;
}

// In-memory cache (server-side, per-instance)
const priceCache: Record<string, PriceData> = {};
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function getTokenPrice(symbol: string): Promise<PriceData | null> {
  const upper = symbol.toUpperCase();
  const cached = priceCache[upper];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  const geckoId = TOKEN_IDS[upper];
  if (!geckoId) return null;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return cached || null;
    const data = await res.json();
    const entry = data[geckoId];
    if (!entry) return cached || null;

    const result: PriceData = {
      price: entry.usd,
      change24h: entry.usd_24h_change || 0,
      timestamp: Date.now(),
    };
    priceCache[upper] = result;
    return result;
  } catch {
    return cached || null;
  }
}

export async function getMultipleTokenPrices(
  symbols: string[]
): Promise<Record<string, PriceData>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const needsFetch: string[] = [];
  const results: Record<string, PriceData> = {};

  // Check cache first
  for (const sym of unique) {
    const cached = priceCache[sym];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      results[sym] = cached;
    } else {
      needsFetch.push(sym);
    }
  }

  if (needsFetch.length === 0) return results;

  // Batch fetch uncached
  const geckoIds = needsFetch
    .map((s) => TOKEN_IDS[s])
    .filter(Boolean)
    .join(",");

  if (!geckoIds) return results;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return results;
    const data = await res.json();

    for (const sym of needsFetch) {
      const geckoId = TOKEN_IDS[sym];
      if (!geckoId || !data[geckoId]) continue;
      const entry = data[geckoId];
      const result: PriceData = {
        price: entry.usd,
        change24h: entry.usd_24h_change || 0,
        timestamp: Date.now(),
      };
      priceCache[sym] = result;
      results[sym] = result;
    }
  } catch {
    // Return whatever we have from cache
  }

  return results;
}

/**
 * Calculate unrealized PnL for an open position.
 */
export function calculateUnrealizedPnl(
  action: string,
  entryPrice: number,
  currentPrice: number,
  leverage: number = 1
): number {
  const isLong = action === "BUY" || action === "LONG";
  const priceChange = isLong
    ? (currentPrice - entryPrice) / entryPrice
    : (entryPrice - currentPrice) / entryPrice;
  return priceChange * leverage * 100;
}
