export interface Provider {
  address: string;
  name: string;
  pnl_pct: number;
  win_rate: number;
  signal_count: number;
  subscriber_count: number;
  avg_return: number;
  streak: number;
  last_signal_age: string;
  signals: Signal[];
}

export interface Signal {
  version: string;
  provider: string;
  timestamp: number;
  signal: {
    action: "BUY" | "SELL";
    token: string;
    chain: string;
    entry_price: number;
    amount_pct: number;
    stop_loss_pct?: number;
    take_profit_pct?: number;
    confidence?: number;
    reasoning?: string;
  };
  proof: {
    tx_hash: string;
    block_number?: number;
  };
  outcome?: {
    exit_price: number;
    pnl_pct: number;
    status: "win" | "loss" | "open";
  };
}

// Real data only - no mock providers
export const providers: Provider[] = [
  {
    address: "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5",
    name: "axiom.base.eth",
    pnl_pct: 0,
    win_rate: 0,
    signal_count: 1,
    subscriber_count: 0,
    avg_return: 0,
    streak: 0,
    last_signal_age: "just now",
    signals: [
      {
        version: "1.0",
        provider: "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5",
        timestamp: 1771523734,
        signal: {
          action: "BUY",
          token: "ETH",
          chain: "base",
          entry_price: 1917.50,
          amount_pct: 1,
          confidence: 0.65,
          reasoning: "Small position, testing bankr-signals skill with real trade"
        },
        proof: {
          tx_hash: "0x81c091531050f61873dbe9bd05ff04870faa531fde2bd984e3efaa0d2ab548d1",
          block_number: 42367165
        },
        outcome: {
          exit_price: 1917.50,
          pnl_pct: 0,
          status: "open"
        }
      }
    ]
  }
];

export function getProvider(address: string): Provider | undefined {
  return providers.find(p => p.address.toLowerCase() === address.toLowerCase());
}

export function getAllSignals(): (Signal & { provider_name: string })[] {
  return providers
    .flatMap(p => p.signals.map(s => ({ ...s, provider_name: p.name })))
    .sort((a, b) => b.timestamp - a.timestamp);
}
