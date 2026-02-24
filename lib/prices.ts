/**
 * Price fetching with DexScreener (primary for all tokens) + CoinGecko (fallback for majors).
 * Uses Infura RPC for onchain Chainlink feeds as last resort.
 */

interface PriceData {
  price: number;
  change24h: number;
  timestamp: number;
  source: string;
}

// In-memory cache
const priceCache: Record<string, PriceData> = {};
const CACHE_TTL_MS = 30_000; // 30 seconds

// CoinGecko ID mapping for majors
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum", BTC: "bitcoin", SOL: "solana", MATIC: "matic-network",
  ARB: "arbitrum", OP: "optimism", LINK: "chainlink", UNI: "uniswap",
  AAVE: "aave", DOGE: "dogecoin", PEPE: "pepe", WIF: "dogwifcoin",
  USDC: "usd-coin", USDT: "tether", DAI: "dai", BNB: "binancecoin",
  AVAX: "avalanche-2", ATOM: "cosmos", DOT: "polkadot", NEAR: "near",
  LTC: "litecoin", XRP: "ripple", ADA: "cardano", SHIB: "shiba-inu",
  CRV: "curve-dao-token", MKR: "maker", SNX: "havven", COMP: "compound-governance-token",
  BONK: "bonk", BRETT: "based-brett", RNDR: "render-token", FET: "fetch-ai",
};

// Token address mapping for DexScreener (Base chain)
const BASE_TOKEN_ADDRESSES: Record<string, string> = {
  ETH: "0x4200000000000000000000000000000000000006", // WETH on Base
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  BRETT: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
  TOSHI: "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
  DEGEN: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
  AXIOM: "0x8e2Fe57d55ee09FBb4DE6c2695F5F67F2F1b882b",
};

/**
 * Primary: DexScreener API — works for any token on any chain
 */
async function fetchFromDexScreener(symbol: string): Promise<PriceData | null> {
  try {
    // Try by token address first (more reliable)
    const addr = BASE_TOKEN_ADDRESSES[symbol.toUpperCase()];
    if (addr) {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${addr}`,
        { signal: AbortSignal.timeout(5000), next: { revalidate: 30 } }
      );
      if (res.ok) {
        const data = await res.json();
        const pair = data.pairs?.[0];
        if (pair) {
          return {
            price: parseFloat(pair.priceUsd),
            change24h: pair.priceChange?.h24 || 0,
            timestamp: Date.now(),
            source: "dexscreener",
          };
        }
      }
    }

    // Fallback: search by symbol on Base
    const searchRes = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${symbol}%20base`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 30 } }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      // Find the most liquid pair on Base
      const basePairs = (data.pairs || [])
        .filter((p: any) => p.chainId === "base")
        .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
      
      const pair = basePairs[0];
      if (pair && pair.priceUsd) {
        return {
          price: parseFloat(pair.priceUsd),
          change24h: pair.priceChange?.h24 || 0,
          timestamp: Date.now(),
          source: "dexscreener",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fallback: CoinGecko for major tokens
 */
async function fetchFromCoinGecko(symbol: string): Promise<PriceData | null> {
  const geckoId = COINGECKO_IDS[symbol.toUpperCase()];
  if (!geckoId) return null;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 30 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[geckoId];
    if (!entry?.usd) return null;

    return {
      price: entry.usd,
      change24h: entry.usd_24h_change || 0,
      timestamp: Date.now(),
      source: "coingecko",
    };
  } catch {
    return null;
  }
}

/**
 * Get token price with DexScreener primary, CoinGecko fallback
 */
export async function getTokenPrice(symbol: string): Promise<PriceData | null> {
  const upper = symbol.toUpperCase();
  
  // Stablecoins — just return $1
  if (["USDC", "USDT", "DAI", "LUSD", "FRAX"].includes(upper)) {
    return { price: 1, change24h: 0, timestamp: Date.now(), source: "static" };
  }

  const cached = priceCache[upper];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  // Try DexScreener first (works for everything including micro-caps)
  let result = await fetchFromDexScreener(upper);
  
  // Fallback to CoinGecko for majors
  if (!result) {
    result = await fetchFromCoinGecko(upper);
  }

  if (result) {
    priceCache[upper] = result;
  }

  return result || cached || null;
}

/**
 * Get multiple token prices
 */
export async function getMultipleTokenPrices(
  symbols: string[]
): Promise<Record<string, PriceData>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const results: Record<string, PriceData> = {};

  // Fetch all in parallel
  await Promise.allSettled(
    unique.map(async (sym) => {
      const price = await getTokenPrice(sym);
      if (price) results[sym] = price;
    })
  );

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
