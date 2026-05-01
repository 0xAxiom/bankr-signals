import { NextRequest, NextResponse } from 'next/server';
import { dbGetProviders, dbGetSignals } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month'); // e.g. "2026-04"

  const now = new Date();
  let year: number;
  let month: number; // 0-indexed

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number);
    year = y;
    month = m - 1;
  } else {
    year = now.getFullYear();
    month = now.getMonth();
  }

  const monthStart = new Date(year, month, 1).toISOString();
  const monthEnd = new Date(year, month + 1, 1).toISOString();

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  try {
    const [providers, allSignals] = await Promise.all([
      dbGetProviders(),
      dbGetSignals(2000),
    ]);

    const monthSignals = allSignals.filter(
      (s) => s.timestamp >= monthStart && s.timestamp < monthEnd
    );

    const closedSignals = monthSignals.filter(
      (s) => s.status === 'closed' && s.pnl_pct != null
    );

    // Per-provider stats
    const providerMap = new Map<string, { name: string; signals: any[]; closed: any[] }>();
    for (const s of monthSignals) {
      const addr = s.provider.toLowerCase();
      if (!providerMap.has(addr)) {
        const meta = providers.find((p: any) => p.address.toLowerCase() === addr);
        providerMap.set(addr, {
          name: meta?.name || `${addr.slice(0, 6)}…${addr.slice(-4)}`,
          signals: [],
          closed: [],
        });
      }
      providerMap.get(addr)!.signals.push(s);
      if (s.status === 'closed' && s.pnl_pct != null) {
        providerMap.get(addr)!.closed.push(s);
      }
    }

    const providerStats = Array.from(providerMap.entries()).map(([addr, data]) => {
      const wins = data.closed.filter((s) => s.pnl_pct > 0).length;
      const avgPnl =
        data.closed.length > 0
          ? data.closed.reduce((sum, s) => sum + s.pnl_pct, 0) / data.closed.length
          : 0;
      return {
        address: addr,
        name: data.name,
        signalCount: data.signals.length,
        closedCount: data.closed.length,
        winRate: data.closed.length > 0 ? Math.round((wins / data.closed.length) * 100) : null,
        avgPnl: parseFloat(avgPnl.toFixed(2)),
      };
    });

    // Best performer: highest avgPnl with >= 2 closed trades
    const qualifiedProviders = providerStats.filter((p) => p.closedCount >= 2);
    const topPerformer =
      qualifiedProviders.sort((a, b) => b.avgPnl - a.avgPnl)[0] || null;

    // Most active
    const mostActive = [...providerStats].sort((a, b) => b.signalCount - a.signalCount)[0] || null;

    // Best single trade
    const bestTrade =
      closedSignals.length > 0
        ? closedSignals.reduce((best, s) => (s.pnl_pct > (best?.pnl_pct ?? -Infinity) ? s : best), closedSignals[0])
        : null;
    const worstTrade =
      closedSignals.length > 0
        ? closedSignals.reduce((worst, s) => (s.pnl_pct < (worst?.pnl_pct ?? Infinity) ? s : worst), closedSignals[0])
        : null;

    // Token breakdown
    const tokenCounts: Record<string, number> = {};
    for (const s of monthSignals) {
      tokenCounts[s.token] = (tokenCounts[s.token] || 0) + 1;
    }
    const topTokens = Object.entries(tokenCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([token, count]) => ({ token, count }));

    // Platform totals
    const totalPnl = closedSignals.reduce((sum, s) => sum + (s.pnl_usd || 0), 0);
    const platformWinRate =
      closedSignals.length > 0
        ? Math.round((closedSignals.filter((s) => s.pnl_pct > 0).length / closedSignals.length) * 100)
        : null;

    // Prev month for nav
    const prevDate = new Date(year, month - 1, 1);
    const nextDate = new Date(year, month + 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const requestedMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    return NextResponse.json({
      month: requestedMonth,
      monthLabel,
      prevMonth,
      nextMonth: requestedMonth >= currentMonth ? null : nextMonth,
      stats: {
        totalSignals: monthSignals.length,
        closedSignals: closedSignals.length,
        openSignals: monthSignals.filter((s) => s.status === 'open').length,
        activeProviders: providerMap.size,
        totalPnlUsd: parseFloat(totalPnl.toFixed(2)),
        platformWinRate,
      },
      topPerformer: topPerformer
        ? {
            address: topPerformer.address,
            name: topPerformer.name,
            avgPnl: topPerformer.avgPnl,
            winRate: topPerformer.winRate,
            signalCount: topPerformer.signalCount,
          }
        : null,
      mostActive: mostActive
        ? {
            address: mostActive.address,
            name: mostActive.name,
            signalCount: mostActive.signalCount,
          }
        : null,
      bestTrade: bestTrade
        ? {
            id: bestTrade.id,
            provider: bestTrade.provider,
            providerName:
              providers.find((p: any) => p.address.toLowerCase() === bestTrade.provider.toLowerCase())?.name ||
              bestTrade.provider.slice(0, 8),
            token: bestTrade.token,
            action: bestTrade.action,
            pnlPct: bestTrade.pnl_pct,
            pnlUsd: bestTrade.pnl_usd,
            entryPrice: bestTrade.entry_price,
            leverage: bestTrade.leverage,
          }
        : null,
      worstTrade: worstTrade && worstTrade.id !== bestTrade?.id
        ? {
            id: worstTrade.id,
            provider: worstTrade.provider,
            providerName:
              providers.find((p: any) => p.address.toLowerCase() === worstTrade.provider.toLowerCase())?.name ||
              worstTrade.provider.slice(0, 8),
            token: worstTrade.token,
            action: worstTrade.action,
            pnlPct: worstTrade.pnl_pct,
            pnlUsd: worstTrade.pnl_usd,
          }
        : null,
      topTokens,
      providerStats: providerStats.sort((a, b) => b.signalCount - a.signalCount),
    });
  } catch (error: any) {
    console.error('Monthly recap error:', error);
    return NextResponse.json({ error: 'Failed to generate monthly recap' }, { status: 500 });
  }
}
