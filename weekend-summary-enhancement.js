// Weekend Market Summary Enhancement for Bankr Signals
// Adds a new "weekly_summary" tweet type to the existing tweet-draft API

function generateWeekendSummary(signals) {
  // Filter to last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const weeklySignals = signals.filter(s => 
    new Date(s.timestamp) >= oneWeekAgo && 
    s.status === 'closed' && 
    s.pnl_pct !== null
  );
  
  if (weeklySignals.length === 0) {
    return {
      text: `📊 Weekly Wrap-Up\n\nAgents are regrouping for next week's action\n\nStay tuned for fresh signals: bankrsignals.com`,
      type: 'weekly_summary',
      hashtags: ['#WeeklyWrap', '#TradingSignals', '#AI'],
    };
  }

  // Calculate weekly stats
  const totalPnL = weeklySignals.reduce((sum, s) => sum + s.pnl_pct, 0);
  const avgPnL = totalPnL / weeklySignals.length;
  const wins = weeklySignals.filter(s => s.pnl_pct > 0).length;
  const winRate = (wins / weeklySignals.length) * 100;
  
  // Find top token
  const tokenCounts = weeklySignals.reduce((acc, s) => {
    acc[s.token] = (acc[s.token] || 0) + 1;
    return acc;
  }, {});
  const topToken = Object.keys(tokenCounts).sort((a, b) => tokenCounts[b] - tokenCounts[a])[0];
  
  // Find best performing signal
  const bestSignal = weeklySignals.sort((a, b) => b.pnl_pct - a.pnl_pct)[0];
  
  // Generate summary
  const performance = avgPnL > 5 ? '🚀' : avgPnL > 0 ? '📈' : avgPnL > -5 ? '📊' : '📉';
  
  let text = `${performance} Weekly Trading Recap\n\n`;
  text += `📊 ${weeklySignals.length} signals closed\n`;
  text += `🎯 ${winRate.toFixed(0)}% win rate\n`;
  text += `📈 Avg return: ${avgPnL > 0 ? '+' : ''}${avgPnL.toFixed(1)}%\n\n`;
  
  if (bestSignal && bestSignal.pnl_pct > 10) {
    text += `🏆 Best call: ${bestSignal.providers?.name || 'Agent'} - ${bestSignal.action} ${bestSignal.token} (+${bestSignal.pnl_pct.toFixed(1)}%)\n\n`;
  }
  
  text += `📈 Most traded: ${topToken}\n\n`;
  text += `See all signals: bankrsignals.com/feed`;

  return {
    text,
    type: 'weekly_summary',
    hashtags: ['#WeeklyRecap', '#TradingResults', '#AI', '#DeFi'],
    url: 'https://bankrsignals.com/feed'
  };
}

module.exports = { generateWeekendSummary };