#!/bin/bash
# Publish a trading signal to bankrsignals.com data/signals.json
# Usage: ./publish-signal.sh <action> <token> <entry_price> <leverage> <tx_hash> [status] [pnl_pct] [exit_price]
#
# Since Vercel is read-only, this script commits directly to the repo
# and triggers a redeploy.

set -euo pipefail

ACTION="${1:?Usage: publish-signal.sh <action> <token> <entry_price> <leverage> <tx_hash> [status] [pnl_pct] [exit_price]}"
TOKEN="${2:?}"
ENTRY_PRICE="${3:?}"
LEVERAGE="${4:-0}"
TX_HASH="${5:?}"
STATUS="${6:-open}"
PNL_PCT="${7:-}"
EXIT_PRICE="${8:-}"

REPO_DIR="$HOME/Github/bankr-signals"
SIGNALS_FILE="$REPO_DIR/data/signals.json"
PROVIDER="0xef2cc7d15d3421629f93ffa39727f14179f31c75"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SIG_ID="sig_$(echo "${PROVIDER}:${TIMESTAMP}:${RANDOM}" | base64 | tr -d '=/+' | head -c 12)"

cd "$REPO_DIR"

# Read current signals
CURRENT=$(cat "$SIGNALS_FILE")

# Build new signal JSON
NEW_SIGNAL=$(python3 -c "
import json, sys
sig = {
    'id': '$SIG_ID',
    'provider': '$PROVIDER',
    'timestamp': '$TIMESTAMP',
    'action': '${ACTION^^}',
    'token': '${TOKEN^^}',
    'chain': 'base',
    'entryPrice': float('$ENTRY_PRICE'),
    'leverage': int('$LEVERAGE') if '$LEVERAGE' != '0' else None,
    'txHash': '$TX_HASH',
    'status': '$STATUS',
}
if '$PNL_PCT':
    sig['pnlPct'] = float('$PNL_PCT')
if '$EXIT_PRICE':
    sig['exitPrice'] = float('$EXIT_PRICE')
    sig['exitTimestamp'] = '$TIMESTAMP'

current = json.loads('''$CURRENT''')
# Dedupe by txHash
existing_hashes = {s.get('txHash') for s in current}
if '$TX_HASH' not in existing_hashes:
    current.append(sig)
    print(json.dumps(current, indent=2))
else:
    # Update existing signal (e.g. closing a position)
    for s in current:
        if s.get('txHash') == '$TX_HASH':
            if '$STATUS': s['status'] = '$STATUS'
            if '$PNL_PCT': s['pnlPct'] = float('$PNL_PCT')
            if '$EXIT_PRICE':
                s['exitPrice'] = float('$EXIT_PRICE')
                s['exitTimestamp'] = '$TIMESTAMP'
    print(json.dumps(current, indent=2))
")

echo "$NEW_SIGNAL" > "$SIGNALS_FILE"

# Commit and push
git add data/signals.json
git commit -m "signal: ${ACTION^^} ${TOKEN^^} @ ${ENTRY_PRICE}" --no-gpg-sign 2>/dev/null || true
git push origin main 2>/dev/null || true

echo "Published: $SIG_ID - ${ACTION^^} ${TOKEN^^} @ ${ENTRY_PRICE}"
