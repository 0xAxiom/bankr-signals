/**
 * Price fetching for crypto, stocks, forex, metals, commodities, and indices.
 * 
 * Sources:
 * - Crypto: DexScreener (primary) + CoinGecko (fallback)
 * - Stocks/Indices/Commodities/Forex/Metals: Yahoo Finance API (free, no key)
 * 
 * Asset classification is automatic — known non-crypto symbols route to Yahoo Finance.
 */

interface PriceData {
  price: number;
  change24h: number;
  timestamp: number;
  source: string;
  assetType?: AssetType;
}

type AssetType = "crypto" | "stock" | "forex" | "metal" | "commodity" | "index";

// In-memory cache
const priceCache: Record<string, PriceData> = {};
const CACHE_TTL_MS = 30_000; // 30 seconds

// ============================================================
// ASSET CLASSIFICATION
// ============================================================

/**
 * Known Avantis-supported stocks. Mapped to Yahoo Finance ticker.
 * Avantis uses short names (COIN, TSLA) — Yahoo uses the same for US stocks.
 */
const STOCK_TICKERS: Record<string, string> = {
  COIN: "COIN",       // Coinbase
  TSLA: "TSLA",       // Tesla
  AAPL: "AAPL",       // Apple
  NVDA: "NVDA",       // Nvidia
  AMZN: "AMZN",       // Amazon
  GOOG: "GOOG",       // Google
  GOOGL: "GOOGL",     // Google Class A
  MSFT: "MSFT",       // Microsoft
  META: "META",        // Meta
  AMD: "AMD",          // AMD
  NFLX: "NFLX",       // Netflix
  PLTR: "PLTR",       // Palantir
  MSTR: "MSTR",       // MicroStrategy
  GME: "GME",          // GameStop
  AMC: "AMC",          // AMC
  SPY: "SPY",          // S&P 500 ETF
};

/**
 * Known forex pairs. Avantis uses "EUR", "GBP" etc — we map to Yahoo tickers.
 */
const FOREX_TICKERS: Record<string, string> = {
  EUR: "EURUSD=X",
  GBP: "GBPUSD=X",
  JPY: "JPYUSD=X",     // Note: inverted vs USDJPY
  AUD: "AUDUSD=X",
  CAD: "CADUSD=X",
  CHF: "CHFUSD=X",
  // Full pair names that Avantis might use
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "JPY=X",
  "AUD/USD": "AUDUSD=X",
  "USD/CAD": "CAD=X",
  "USD/CHF": "CHF=X",
};

/**
 * Metals and commodities → Yahoo Finance tickers.
 */
const METAL_COMMODITY_TICKERS: Record<string, string> = {
  XAU: "GC=F",         // Gold
  GOLD: "GC=F",
  XAG: "SI=F",         // Silver
  SILVER: "SI=F",
  WTI: "CL=F",         // Crude Oil
  OIL: "CL=F",
  BRENT: "BZ=F",
  NATGAS: "NG=F",      // Natural Gas
};

/**
 * Index tickers.
 */
const INDEX_TICKERS: Record<string, string> = {
  "S&P500": "^GSPC",
  SPX: "^GSPC",
  NASDAQ: "^IXIC",
  NDX: "^NDX",
  DJI: "^DJI",
  DOW: "^DJI",
  VIX: "^VIX",
  FTSE: "^FTSE",
  DAX: "^GDAXI",
  NIKKEI: "^N225",
};

/**
 * Classify a symbol into its asset type and return the appropriate ticker.
 */
function classifyAsset(symbol: string): { type: AssetType; ticker: string } {
  const upper = symbol.toUpperCase().trim();
  
  if (STOCK_TICKERS[upper]) return { type: "stock", ticker: STOCK_TICKERS[upper] };
  if (FOREX_TICKERS[upper]) return { type: "forex", ticker: FOREX_TICKERS[upper] };
  if (METAL_COMMODITY_TICKERS[upper]) {
    const type: AssetType = ["XAU", "GOLD", "XAG", "SILVER"].includes(upper) ? "metal" : "commodity";
    return { type, ticker: METAL_COMMODITY_TICKERS[upper] };
  }
  if (INDEX_TICKERS[upper]) return { type: "index", ticker: INDEX_TICKERS[upper] };
  
  // Default to crypto
  return { type: "crypto", ticker: upper };
}

/**
 * Check if a symbol is a non-crypto asset (stock, forex, metal, commodity, index).
 */
export function isTraditionalAsset(symbol: string): boolean {
  return classifyAsset(symbol).type !== "crypto";
}

/**
 * Get the asset type for a symbol.
 */
export function getAssetType(symbol: string): AssetType {
  return classifyAsset(symbol).type;
}

// ============================================================
// CRYPTO PRICE SOURCES
// ============================================================

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
  HYPE: "hyperliquid", SUI: "sui", SEI: "sei-network", TIA: "celestia",
  JUP: "jupiter-exchange-solana", W: "wormhole", PENDLE: "pendle",
};

// Token address mapping for DexScreener (Base chain)
const BASE_TOKEN_ADDRESSES: Record<string, string> = {
  ETH: "0x4200000000000000000000000000000000000006",
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  BRETT: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
  TOSHI: "0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4",
  DEGEN: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
  AXIOM: "0x8e2Fe57d55ee09FBb4DE6c2695F5F67F2F1b882b",
};

async function fetchFromDexScreener(symbol: string): Promise<PriceData | null> {
  try {
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
            assetType: "crypto",
          };
        }
      }
    }

    const searchRes = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${symbol}%20base`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 30 } }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
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
          assetType: "crypto",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

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
      assetType: "crypto",
    };
  } catch {
    return null;
  }
}

// ============================================================
// TRADITIONAL ASSET PRICE SOURCE (Yahoo Finance)
// ============================================================

/**
 * Fetch price from Yahoo Finance (free, no API key required).
 * Uses the v8 chart endpoint which returns current price + change data.
 */
async function fetchFromYahooFinance(
  yahooTicker: string,
  assetType: AssetType
): Promise<PriceData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 60 },
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    
    const meta = result.meta;
    const currentPrice = meta?.regularMarketPrice;
    const prevClose = meta?.chartPreviousClose || meta?.previousClose;
    
    if (!currentPrice) return null;
    
    const change24h = prevClose
      ? ((currentPrice - prevClose) / prevClose) * 100
      : 0;
    
    return {
      price: currentPrice,
      change24h,
      timestamp: Date.now(),
      source: "yahoo",
      assetType,
    };
  } catch {
    return null;
  }
}

/**
 * Fallback: Use a simple search to find the right Yahoo ticker
 * when the symbol doesn't match our hardcoded map.
 */
async function searchYahooTicker(symbol: string): Promise<string | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=3&newsCount=0`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const quote = data?.quotes?.[0];
    return quote?.symbol || null;
  } catch {
    return null;
  }
}

// ============================================================
// UNIFIED PRICE API
// ============================================================

/**
 * Get price for any asset — crypto, stock, forex, metal, commodity, or index.
 * Automatically routes to the correct data source.
 */
export async function getTokenPrice(symbol: string): Promise<PriceData | null> {
  const upper = symbol.toUpperCase().trim();
  
  // Stablecoins
  if (["USDC", "USDT", "DAI", "LUSD", "FRAX"].includes(upper)) {
    return { price: 1, change24h: 0, timestamp: Date.now(), source: "static", assetType: "crypto" };
  }

  const cached = priceCache[upper];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  // Classify the asset
  const { type, ticker } = classifyAsset(upper);
  
  let result: PriceData | null = null;

  if (type !== "crypto") {
    // Traditional asset — use Yahoo Finance
    result = await fetchFromYahooFinance(ticker, type);
    
    // If hardcoded ticker failed, try searching Yahoo
    if (!result) {
      const searchedTicker = await searchYahooTicker(upper);
      if (searchedTicker) {
        result = await fetchFromYahooFinance(searchedTicker, type);
      }
    }
  } else {
    // Crypto — DexScreener first, CoinGecko fallback
    result = await fetchFromDexScreener(upper);
    if (!result) {
      result = await fetchFromCoinGecko(upper);
    }
  }

  if (result) {
    priceCache[upper] = result;
  }

  return result || cached || null;
}

/**
 * Get multiple token/asset prices in parallel.
 */
export async function getMultipleTokenPrices(
  symbols: string[]
): Promise<Record<string, PriceData>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase().trim()))];
  const results: Record<string, PriceData> = {};

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
