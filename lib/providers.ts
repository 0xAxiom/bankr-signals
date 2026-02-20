import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");
const SIGNALS_FILE = path.join(DATA_DIR, "signals.json");

export interface RegisteredProvider {
  address: string;
  name: string;
  description: string;
  registeredAt: string;
  chain: string;
  agent?: string; // agent platform (openclaw, bankr, etc.)
  website?: string;
  twitter?: string;
}

export interface PublishedSignal {
  id: string;
  provider: string; // wallet address
  timestamp: string;
  action: "BUY" | "SELL" | "LONG" | "SHORT";
  token: string;
  chain: string;
  entryPrice: number;
  leverage?: number;
  confidence?: number;
  reasoning?: string;
  txHash?: string;
  stopLossPct?: number;
  takeProfitPct?: number;
  collateralUsd?: number;
  status: "open" | "closed" | "stopped";
  exitPrice?: number;
  exitTimestamp?: string;
  pnlPct?: number;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function getProviders(): RegisteredProvider[] {
  ensureDataDir();
  if (!existsSync(PROVIDERS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(PROVIDERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function getProvider(address: string): RegisteredProvider | undefined {
  return getProviders().find(
    (p) => p.address.toLowerCase() === address.toLowerCase()
  );
}

export function registerProvider(provider: RegisteredProvider): RegisteredProvider {
  ensureDataDir();
  const providers = getProviders();
  const existing = providers.findIndex(
    (p) => p.address.toLowerCase() === provider.address.toLowerCase()
  );
  if (existing >= 0) {
    providers[existing] = { ...providers[existing], ...provider };
  } else {
    providers.push(provider);
  }
  writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2));
  return provider;
}

export function getSignals(): PublishedSignal[] {
  ensureDataDir();
  if (!existsSync(SIGNALS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(SIGNALS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function getSignalsByProvider(address: string): PublishedSignal[] {
  return getSignals().filter(
    (s) => s.provider.toLowerCase() === address.toLowerCase()
  );
}

export function addSignal(signal: PublishedSignal): PublishedSignal {
  ensureDataDir();
  const signals = getSignals();
  // Dedupe by id
  const existing = signals.findIndex((s) => s.id === signal.id);
  if (existing >= 0) {
    signals[existing] = signal;
  } else {
    signals.push(signal);
  }
  writeFileSync(SIGNALS_FILE, JSON.stringify(signals, null, 2));
  return signal;
}

export function updateSignal(
  id: string,
  update: Partial<PublishedSignal>
): PublishedSignal | null {
  ensureDataDir();
  const signals = getSignals();
  const idx = signals.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  signals[idx] = { ...signals[idx], ...update };
  writeFileSync(SIGNALS_FILE, JSON.stringify(signals, null, 2));
  return signals[idx];
}

export function generateSignalId(provider: string, timestamp: string): string {
  const hash = Buffer.from(`${provider}:${timestamp}:${Math.random()}`).toString("base64url").slice(0, 12);
  return `sig_${hash}`;
}
