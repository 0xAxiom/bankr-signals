/**
 * Extract entry price from on-chain transaction data via Blockscout.
 * 
 * Strategy: Parse token transfers from the TX receipt.
 * For a BUY/LONG: find the stablecoin/ETH amount spent and the token amount received.
 * Entry price = amount_spent_usd / tokens_received.
 */

// Well-known stablecoins and quote tokens on Base
const QUOTE_TOKENS: Record<string, { symbol: string; decimals: number; isStable: boolean }> = {
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { symbol: "USDC", decimals: 6, isStable: true },
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": { symbol: "DAI", decimals: 18, isStable: true },
  "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": { symbol: "USDbC", decimals: 6, isStable: true },
  "0x4200000000000000000000000000000000000006": { symbol: "WETH", decimals: 18, isStable: false },
};

// ERC-20 Transfer event topic
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

interface TokenTransfer {
  token: string;      // contract address (lowercase)
  symbol: string;
  decimals: number;
  from: string;
  to: string;
  rawValue: bigint;
  value: number;       // human-readable
  isQuote: boolean;
  isStable: boolean;
}

interface OnchainPriceResult {
  entryPrice: number;
  collateralUsd: number;
  tokensReceived: number;
  tokenAddress: string;
  tokenSymbol: string;   // actual token symbol found on-chain
  quoteToken: string;
  ethPriceUsed?: number;  // if WETH was the intermediary
  method: "blockscout" | "rpc-logs";
}

/**
 * Fetch token transfers from Blockscout API for a Base transaction.
 */
async function fetchBlockscoutTransfers(txHash: string): Promise<TokenTransfer[]> {
  const url = `https://base.blockscout.com/api/v2/transactions/${txHash}/token-transfers`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  
  if (!res.ok) {
    throw new Error(`Blockscout API returned ${res.status}`);
  }
  
  const data = await res.json();
  const items = data.items || [];
  
  return items.map((t: any) => {
    const addr = (t.token?.address || t.token?.address_hash || "").toLowerCase();
    const decimals = parseInt(t.token?.decimals || "18");
    const rawValue = BigInt(t.total?.value || "0");
    const quote = QUOTE_TOKENS[addr];
    
    return {
      token: addr,
      symbol: t.token?.symbol || "UNKNOWN",
      decimals,
      from: (t.from?.hash || "").toLowerCase(),
      to: (t.to?.hash || "").toLowerCase(),
      rawValue,
      value: Number(rawValue) / Math.pow(10, decimals),
      isQuote: !!quote,
      isStable: quote?.isStable || false,
    };
  });
}

/**
 * Get current ETH price in USD from DexScreener (WETH/USDC pool on Base).
 */
async function getEthPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/pairs/base/0xd0b53D9277642d899DF5C87A3966A349A798F224",
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    return parseFloat(data.pair?.priceUsd || "0") || 3000; // fallback
  } catch {
    return 3000; // reasonable fallback
  }
}

/**
 * Extract entry price from a transaction hash.
 * 
 * Logic:
 * 1. Get all token transfers from the TX
 * 2. Identify the "quote" side (USDC, WETH, etc.) — what the trader spent
 * 3. Identify the "base" side — the target token received
 * 4. Calculate: entry_price = quote_value_usd / base_tokens_received
 * 
 * For multi-hop swaps (USDC → WETH → TOKEN), we find the initial USDC spend
 * and the final token receipt.
 */
export async function extractEntryPrice(
  txHash: string,
  expectedToken: string,
  traderAddress: string,
): Promise<OnchainPriceResult | null> {
  try {
    const transfers = await fetchBlockscoutTransfers(txHash);
    
    if (transfers.length === 0) {
      return null;
    }
    
    const trader = traderAddress.toLowerCase();
    const tokenUpper = expectedToken.toUpperCase();
    
    // Find token transfers matching the expected token (received by trader or a related address)
    // In multi-hop swaps, the final transfer goes to the trader's smart wallet
    const tokenTransfers = transfers.filter(t => 
      t.symbol.toUpperCase() === tokenUpper && !t.isQuote
    );
    
    // Find quote transfers (stablecoins or WETH sent by trader)
    const quoteTransfers = transfers.filter(t => t.isQuote);
    
    if (tokenTransfers.length === 0) {
      // Token name might not match exactly — find non-quote tokens
      const nonQuoteTransfers = transfers.filter(t => !t.isQuote);
      if (nonQuoteTransfers.length === 0) return null;
      
      // Use the largest non-quote transfer as the target token
      const largest = nonQuoteTransfers.reduce((a, b) => 
        a.rawValue > b.rawValue ? a : b
      );
      tokenTransfers.push(largest);
    }
    
    if (quoteTransfers.length === 0) {
      return null;
    }
    
    // Sum up total tokens received (largest contiguous transfer to a single address)
    // In the GEM example: 330.26T GEM to trader, 74.9B to fee address
    // We want the largest transfer as the main position
    const mainTokenTransfer = tokenTransfers.reduce((a, b) =>
      a.rawValue > b.rawValue ? a : b
    );
    const tokensReceived = mainTokenTransfer.value;
    const tokenAddress = mainTokenTransfer.token;
    
    // Find the initial spend — the first quote token leaving the trader
    // For USDC direct: just use USDC amount
    // For USDC → WETH → TOKEN: use the initial USDC amount
    const stableTransfers = quoteTransfers.filter(t => t.isStable);
    const wethTransfers = quoteTransfers.filter(t => t.symbol === "WETH");
    
    let collateralUsd: number;
    let quoteToken: string;
    let ethPriceUsed: number | undefined;
    
    if (stableTransfers.length > 0) {
      // Use the largest stablecoin transfer as the spend amount
      // (first one is usually the trader's outflow)
      const mainStable = stableTransfers.reduce((a, b) =>
        a.value > b.value ? a : b
      );
      collateralUsd = mainStable.value;
      quoteToken = mainStable.symbol;
    } else if (wethTransfers.length > 0) {
      // No stablecoin — trader spent WETH directly
      const mainWeth = wethTransfers.reduce((a, b) =>
        a.value > b.value ? a : b
      );
      ethPriceUsed = await getEthPriceUsd();
      collateralUsd = mainWeth.value * ethPriceUsed;
      quoteToken = "WETH";
    } else {
      return null;
    }
    
    if (tokensReceived === 0 || collateralUsd === 0) {
      return null;
    }
    
    const entryPrice = collateralUsd / tokensReceived;
    
    return {
      entryPrice,
      collateralUsd,
      tokensReceived,
      tokenAddress,
      tokenSymbol: mainTokenTransfer.symbol,
      quoteToken,
      ethPriceUsed,
      method: "blockscout",
    };
  } catch (error: any) {
    console.error("extractEntryPrice error:", error.message);
    return null;
  }
}

/**
 * Alias for getCurrentPrice — used by prices API route.
 */
export async function getPriceByAddress(tokenAddress: string): Promise<number | null> {
  return getCurrentPrice(tokenAddress);
}

/**
 * Get token address from a transaction hash. Used by signals.ts for backfilling.
 */
export async function getTokenFromTx(txHash: string): Promise<{ tokenAddress: string; symbol: string } | null> {
  try {
    const transfers = await fetchBlockscoutTransfers(txHash);
    const nonQuote = transfers.filter(t => !t.isQuote);
    if (nonQuote.length === 0) return null;
    const largest = nonQuote.reduce((a, b) => a.rawValue > b.rawValue ? a : b);
    return { tokenAddress: largest.token, symbol: largest.symbol };
  } catch {
    return null;
  }
}

/**
 * Get current token price from DexScreener.
 */
export async function getCurrentPrice(tokenAddress: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    const pairs = data.pairs || [];
    
    if (pairs.length === 0) return null;
    
    // Use the pair with highest liquidity
    const bestPair = pairs.reduce((a: any, b: any) =>
      (a.liquidity?.usd || 0) > (b.liquidity?.usd || 0) ? a : b
    );
    
    return parseFloat(bestPair.priceUsd || "0") || null;
  } catch {
    return null;
  }
}
