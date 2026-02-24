import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Provider operations
export async function dbGetProviders() {
  const { data, error } = await supabase
    .from("signal_providers")
    .select("*")
    .order("registered_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function dbGetProvider(address: string) {
  const { data, error } = await supabase
    .from("signal_providers")
    .select("*")
    .ilike("address", address)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data || null;
}

export async function dbGetProviderByName(name: string) {
  const { data, error } = await supabase
    .from("signal_providers")
    .select("address, name")
    .ilike("name", name)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function dbRegisterProvider(input: {
  address: string;
  name: string;
  bio?: string;
  description?: string;
  avatar?: string;
  chain?: string;
  agent?: string;
  website?: string;
  twitter?: string;
  farcaster?: string;
  github?: string;
}) {
  const { data, error } = await supabase
    .from("signal_providers")
    .upsert({
      address: input.address.toLowerCase(),
      name: input.name,
      bio: input.bio || null,
      description: input.description || null,
      avatar: input.avatar || null,
      chain: input.chain || "base",
      agent: input.agent || null,
      website: input.website || null,
      twitter: input.twitter || null,
      farcaster: input.farcaster || null,
      github: input.github || null,
      registered_at: new Date().toISOString(),
    }, { onConflict: "address" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Signal operations
export async function dbGetSignals(limit = 50) {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function dbGetSignalsByProvider(address: string, limit = 50) {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .ilike("provider", address)
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function dbGetSignal(id: string) {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function dbAddSignal(input: {
  id: string;
  provider: string;
  action: string;
  token: string;
  chain?: string;
  entryPrice: number;
  leverage?: number;
  confidence?: number;
  reasoning?: string;
  txHash?: string;
  stopLossPct?: number;
  takeProfitPct?: number;
  collateralUsd?: number;
  status?: string;
}) {
  const { data, error } = await supabase
    .from("signals")
    .insert({
      id: input.id,
      provider: input.provider.toLowerCase(),
      action: input.action.toUpperCase(),
      token: input.token,
      chain: input.chain || "base",
      entry_price: input.entryPrice,
      leverage: input.leverage || null,
      confidence: input.confidence || null,
      reasoning: input.reasoning || null,
      tx_hash: input.txHash || null,
      stop_loss_pct: input.stopLossPct || null,
      take_profit_pct: input.takeProfitPct || null,
      collateral_usd: input.collateralUsd || null,
      status: input.status || "open",
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbCloseSignal(id: string, exitPrice: number, pnlPct?: number, pnlUsd?: number, exitTxHash?: string) {
  const { data, error } = await supabase
    .from("signals")
    .update({
      status: "closed",
      exit_price: exitPrice,
      exit_timestamp: new Date().toISOString(),
      pnl_pct: pnlPct || null,
      pnl_usd: pnlUsd || null,
      exit_tx_hash: exitTxHash || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Stats
export async function dbGetProviderStats(address: string) {
  const { data: signals } = await supabase
    .from("signals")
    .select("status, pnl_pct, pnl_usd")
    .ilike("provider", address);

  const all = signals || [];
  const closed = all.filter(s => s.status === "closed");
  const wins = closed.filter(s => (s.pnl_pct || 0) > 0).length;
  const losses = closed.filter(s => (s.pnl_pct || 0) <= 0).length;
  const openCount = all.filter(s => s.status === "open").length;
  const avgPnl = closed.length > 0 ? closed.reduce((s, c) => s + (c.pnl_pct || 0), 0) / closed.length : 0;
  const totalPnlUsd = closed.reduce((s, c) => s + (c.pnl_usd || 0), 0);

  return {
    total_signals: all.length,
    wins,
    losses,
    open_positions: openCount,
    avg_pnl_pct: avgPnl,
    total_pnl_usd: totalPnlUsd,
    win_rate: closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0,
  };
}

export async function dbGetLeaderboard() {
  const providers = await dbGetProviders();
  const leaderboard = await Promise.all(
    providers.map(async (p) => {
      const stats = await dbGetProviderStats(p.address);
      return { ...p, ...stats };
    })
  );
  return leaderboard.sort((a, b) => {
    // Primary: total PnL USD
    if (b.total_pnl_usd !== a.total_pnl_usd) return b.total_pnl_usd - a.total_pnl_usd;
    // Secondary: total signals (active providers rank higher)
    return b.total_signals - a.total_signals;
  });
}
