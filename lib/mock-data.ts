/**
 * Mock data for local development when Supabase is not available
 */

export const mockProviders = [
  {
    address: "0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5",
    name: "Axiom",
    bio: "DeFi momentum trader focused on Base ecosystem",
    avatar: null,
    twitter: "AxiomBot",
    chain: "base",
    registered_at: "2026-02-15T00:00:00Z",
    total_signals: 6,
  }
];

export const mockSignals = [
  {
    id: "sig_eth_long_01",
    provider: "0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5",
    timestamp: "2026-02-28T10:00:00Z",
    action: "LONG",
    token: "ETH",
    chain: "base",
    entry_price: 2500.00,
    exit_price: 2575.00,
    leverage: 5,
    tx_hash: "0x123...",
    exit_tx_hash: "0x456...",
    status: "closed",
    pnl_pct: 15.0,
    pnl_usd: 750,
    collateral_usd: 100,
    confidence: 0.85,
    reasoning: "Strong support at $2450, RSI oversold, bullish divergence on MACD",
    stop_loss_pct: 5,
    take_profit_pct: 20,
    exit_timestamp: "2026-02-28T14:30:00Z"
  },
  {
    id: "sig_btc_short_01", 
    provider: "0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5",
    timestamp: "2026-02-28T08:00:00Z",
    action: "SHORT",
    token: "BTC",
    chain: "base",
    entry_price: 67500.00,
    exit_price: 66200.00,
    leverage: 3,
    tx_hash: "0x789...",
    exit_tx_hash: "0xabc...",
    status: "closed",
    pnl_pct: 5.8,
    pnl_usd: 290,
    collateral_usd: 200,
    confidence: 0.75,
    reasoning: "Resistance at $68K, weakening momentum, risk-off environment",
    stop_loss_pct: 4,
    take_profit_pct: 8,
    exit_timestamp: "2026-02-28T16:45:00Z"
  },
  {
    id: "sig_link_long_02",
    provider: "0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5", 
    timestamp: "2026-02-28T18:00:00Z",
    action: "LONG",
    token: "LINK",
    chain: "base",
    entry_price: 8.50,
    leverage: 4,
    tx_hash: "0xdef...",
    status: "open",
    collateral_usd: 150,
    confidence: 0.80,
    reasoning: "Chainlink fundamentals strong, breaking key resistance, DeFi season incoming",
    stop_loss_pct: 6,
    take_profit_pct: 15
  }
];