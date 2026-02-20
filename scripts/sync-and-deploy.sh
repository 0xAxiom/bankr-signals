#!/usr/bin/env bash
# Sync trade_log.jsonl to public/trade-data.json and deploy to Vercel
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TRADE_LOG="${SIGNALS_DIR:-$HOME/clawd/trading/signals}/trade_log.jsonl"
BUNDLED="$REPO_DIR/public/trade-data.json"

cd "$REPO_DIR"

# Check for trade log
if [[ ! -f "$TRADE_LOG" ]]; then
  echo "No trade log found at $TRADE_LOG - skipping sync"
  exit 0
fi

LOCAL_COUNT=$(wc -l < "$TRADE_LOG" | tr -d ' ')
BUNDLED_COUNT=$(node -e "try{console.log(require('$BUNDLED').length)}catch{console.log(0)}" 2>/dev/null || echo 0)

if [[ "$LOCAL_COUNT" -le "$BUNDLED_COUNT" ]]; then
  echo "Already synced ($LOCAL_COUNT local, $BUNDLED_COUNT bundled)"
  exit 0
fi

echo "Syncing: $LOCAL_COUNT local > $BUNDLED_COUNT bundled"

# Export JSONL to JSON array
node -e "
const fs = require('fs');
const lines = fs.readFileSync('$TRADE_LOG', 'utf-8')
  .split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean);
fs.writeFileSync('$BUNDLED', JSON.stringify(lines, null, 2));
console.log(lines.length + ' entries exported to trade-data.json');
"

# Commit
git add public/trade-data.json
git diff --cached --quiet && { echo "No changes to commit"; exit 0; }
git commit -m "sync: update trade data ($LOCAL_COUNT entries)"

# Deploy
VERCEL_TOKEN=$(security find-generic-password -a axiom -s openclaw.AXIOM_VERCEL_TOKEN -w 2>/dev/null || echo "")
if [[ -n "$VERCEL_TOKEN" ]]; then
  npx vercel --prod --yes --token "$VERCEL_TOKEN"
  echo "Deployed to Vercel"
else
  echo "No Vercel token found - push to GitHub for auto-deploy"
  git push origin main
fi
