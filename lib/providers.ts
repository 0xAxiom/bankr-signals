import { readFileSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");
const SIGNALS_FILE = path.join(DATA_DIR, "signals.json");

export interface RegisteredProvider {
  address: string;
  name: string;
  description: string;
  bio?: string;
  avatar?: string;
  registeredAt: string;
  chain: string;
  agent?: string;
  website?: string;
  twitter?: string;
  farcaster?: string;
  github?: string;
}

export interface PublishedSignal {
  id: string;
  provider: string;
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

// Issue #19: Cache provider list per request (module-level singleton per cold start)
let _providersCache: RegisteredProvider[] | null = null;
let _signalsCache: PublishedSignal[] | null = null;

export function getProviders(): RegisteredProvider[] {
  if (_providersCache) return _providersCache;
  if (!existsSync(PROVIDERS_FILE)) return [];
  try {
    _providersCache = JSON.parse(readFileSync(PROVIDERS_FILE, "utf-8"));
    return _providersCache!;
  } catch {
    return [];
  }
}

export function getProvider(address: string): RegisteredProvider | undefined {
  return getProviders().find(
    (p) => p.address.toLowerCase() === address.toLowerCase()
  );
}

// Issue #3: Writes return read-only error on Vercel (no writable filesystem)
function readOnlyError(): never {
  const err: any = new Error(
    "Read-only in production. To register a provider or publish signals, submit a PR to data/providers.json or data/signals.json in the bankr-signals repo."
  );
  err.code = "READ_ONLY";
  throw err;
}

export function registerProvider(_provider: RegisteredProvider): RegisteredProvider {
  return readOnlyError();
}

export function getSignals(): PublishedSignal[] {
  if (_signalsCache) return _signalsCache;
  if (!existsSync(SIGNALS_FILE)) return [];
  try {
    _signalsCache = JSON.parse(readFileSync(SIGNALS_FILE, "utf-8"));
    return _signalsCache!;
  } catch {
    return [];
  }
}

export function getSignalsByProvider(address: string): PublishedSignal[] {
  return getSignals().filter(
    (s) => s.provider.toLowerCase() === address.toLowerCase()
  );
}

export function addSignal(_signal: PublishedSignal): PublishedSignal {
  return readOnlyError();
}

export function updateSignal(
  _id: string,
  _update: Partial<PublishedSignal>
): PublishedSignal | null {
  return readOnlyError();
}

export function generateSignalId(provider: string, timestamp: string): string {
  const hash = Buffer.from(`${provider}:${timestamp}:${Math.random()}`).toString("base64url").slice(0, 12);
  return `sig_${hash}`;
}
