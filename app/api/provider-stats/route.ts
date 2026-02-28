import { NextRequest } from "next/server";
import { getProviderStats } from "@/lib/signals";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return Response.json({ error: 'Address parameter required' }, { status: 400 });
  }

  try {
    const providers = await getProviderStats();
    const provider = providers.find(p => p.address.toLowerCase() === address.toLowerCase());
    
    if (!provider) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }

    const trades = provider.trades || [];
    const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const openTrades = trades.filter(t => t.status === 'open');
    
    // Calculate stats
    const totalSignals = trades.length;
    const closedSignals = closedTrades.length;
    const openSignals = openTrades.length;
    
    // Win rate (only for closed trades with PnL data)
    const winsCount = closedTrades.filter(t => t.pnl != null && t.pnl > 0).length;
    const winRate = closedSignals > 0 ? (winsCount / closedSignals) * 100 : 0;
    
    // Average PnL (only for closed trades)
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgPnl = closedSignals > 0 ? totalPnl / closedSignals : 0;
    
    // Best and worst trades
    const bestTrade = closedTrades.length > 0 
      ? closedTrades.reduce((best, trade) => (trade.pnl || 0) > (best.pnl || 0) ? trade : best)
      : null;
    
    const worstTrade = closedTrades.length > 0
      ? closedTrades.reduce((worst, trade) => (trade.pnl || 0) < (worst.pnl || 0) ? trade : worst)
      : null;
    
    // Average confidence
    const tradesWithConfidence = trades.filter(t => t.confidence != null);
    const avgConfidence = tradesWithConfidence.length > 0
      ? tradesWithConfidence.reduce((sum, t) => sum + (t.confidence || 0), 0) / tradesWithConfidence.length
      : null;
    
    // Recent activity
    const mostRecentTrade = trades.length > 0
      ? trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      : null;
    
    let recentActivity = 'No recent activity';
    if (mostRecentTrade) {
      const daysSince = Math.floor((Date.now() - new Date(mostRecentTrade.timestamp).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince === 0) {
        recentActivity = 'Active today';
      } else if (daysSince === 1) {
        recentActivity = 'Active yesterday';
      } else if (daysSince <= 7) {
        recentActivity = `Active ${daysSince} days ago`;
      } else {
        recentActivity = `Last seen ${daysSince} days ago`;
      }
    }

    return Response.json({
      totalSignals,
      openSignals,
      closedSignals,
      winRate,
      totalPnl,
      avgPnl,
      bestTrade,
      worstTrade,
      avgConfidence,
      recentActivity
    });

  } catch (error) {
    console.error('Provider stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}