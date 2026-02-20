# Bankr Signals Heartbeat

Automated routine for keeping the signal dashboard current with real trade data.
Run during agent heartbeats or as a standalone cron.

See [SKILL.md](SKILL.md) for full architecture and signal format.

## Checklist

### 1. Check for New Trades

```bash
# Count entries in trade log vs bundled data
LOCAL_COUNT=$(wc -l < ~/clawd/trading/signals/trade_log.jsonl 2>/dev/null || echo 0)
BUNDLED_COUNT=$(node -e "console.log(require('./public/trade-data.json').length)" 2>/dev/null || echo 0)
```

If `LOCAL_COUNT > BUNDLED_COUNT`, new trades exist that haven't been synced.

### 2. Post Unsynced Signals

For each new trade since last sync, ensure it has a valid entry in trade_log.jsonl.

**After ANY trade execution** (Bankr CLI, Avantis, manual), append a signal:

```bash
# Via post-signal script
scripts/post-signal.sh \
  --action BUY \
  --token ETH \
  --entry-price 2650.00 \
  --leverage 5 \
  --tx-hash 0x... \
  --confidence 0.85 \
  --reasoning "Signal reasoning here"
```

**Agents integrating with bankr-signals MUST call post-signal.sh (or append
to trade_log.jsonl directly) every time they execute a trade.** This is how
signals reach the dashboard.

### 3. Sync Trade Data to Dashboard

```bash
cd ~/Github/bankr-signals && scripts/sync-and-deploy.sh
```

This script:
1. Exports `trade_log.jsonl` to `public/trade-data.json`
2. Commits the change
3. Deploys to Vercel with Axiom's token

### 4. Verify Dashboard Health

After sync, check that the API returns valid data:

```bash
curl -s https://bankr-signals.vercel.app/api/leaderboard | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
const p = j.providers[0];
if (p) console.log('PnL:', p.pnl_pct, '| Win:', p.win_rate + '%', '| Signals:', p.signal_count);
else console.log('WARNING: No providers returned');
"
```

### 5. Report to Telegram (if changes)

If new trades were synced, send a summary to Telegram:

```
📡 Bankr Signals synced
New trades: {count}
Total PnL: {pnl}%
Win rate: {win_rate}%
Streak: {streak}
Dashboard: https://bankr-signals.vercel.app
```

### 6. Check Open Positions

Query current positions for PnL updates on open trades:

```bash
~/clawd/trading/scripts/execute-trade.sh "show my Avantis positions"
```

If a position has been closed (TP/SL hit), update the trade log entry
and re-sync.

## Frequency

- **Signal posting**: Immediately after every trade execution
- **Dashboard sync**: Every heartbeat (if new trades exist), or at minimum 2x/day
- **Position check**: Every heartbeat (report PnL changes to Telegram)
- **Full health check**: 1x/day (verify API, check for stale data)

## Integration Points

- **Trading system** (`~/clawd/trading/`): Generates signals via deepseek-r1, executes via Bankr CLI
- **Bankr skill** (`~/.clawdbot/skills/bankr/`): Trade execution layer
- **Main heartbeat** (`~/clawd/HEARTBEAT.md`): Can delegate signal sync to this file
- **SKILL.md**: Full architecture, signal format, and deployment docs

## Error Handling

- If CoinGecko rate-limits (429), PnL uses cached prices (60s TTL)
- If Vercel deploy fails, retry once then alert via Telegram
- If trade_log.jsonl is missing/empty, skip sync (don't deploy empty data)
- If post-signal.sh fails, fall back to manual JSONL append
