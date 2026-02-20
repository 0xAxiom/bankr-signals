#!/usr/bin/env bash
# Post a trading signal to trade_log.jsonl
# Usage: post-signal.sh --action BUY --token ETH --entry-price 2650 [--leverage 5] [--tx-hash 0x...] [--confidence 0.85] [--reasoning "text"]

set -euo pipefail

TRADE_LOG="${SIGNALS_DIR:-$HOME/clawd/trading/signals}/trade_log.jsonl"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

ACTION="" TOKEN="" ENTRY_PRICE="" LEVERAGE="" TX_HASH="" CONFIDENCE="" REASONING=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --action)     ACTION="$2"; shift 2 ;;
    --token)      TOKEN="$2"; shift 2 ;;
    --entry-price) ENTRY_PRICE="$2"; shift 2 ;;
    --leverage)   LEVERAGE="$2"; shift 2 ;;
    --tx-hash)    TX_HASH="$2"; shift 2 ;;
    --confidence) CONFIDENCE="$2"; shift 2 ;;
    --reasoning)  REASONING="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$ACTION" || -z "$TOKEN" || -z "$ENTRY_PRICE" ]]; then
  echo "Required: --action, --token, --entry-price" >&2
  exit 1
fi

# Normalize action
ACTION=$(echo "$ACTION" | tr '[:lower:]' '[:upper:]')

# Build prompt string
PROMPT=$(echo "$ACTION" | tr '[:upper:]' '[:lower:]')
case "$ACTION" in
  BUY|LONG) PROMPT="$PROMPT \$$ENTRY_PRICE of $TOKEN on base" ;;
  SELL|SHORT) PROMPT="$PROMPT $TOKEN on base at \$$ENTRY_PRICE" ;;
esac

# Build response string
RESPONSE="executed $ACTION $TOKEN at \$$ENTRY_PRICE"
[[ -n "$LEVERAGE" ]] && RESPONSE="$RESPONSE (${LEVERAGE}x leverage)"
[[ -n "$TX_HASH" ]] && RESPONSE="$RESPONSE\n\ntx: https://basescan.org/tx/$TX_HASH"

# Build JSON entry
ENTRY=$(cat <<EOF
{"timestamp":"$TIMESTAMP","prompt":"$PROMPT","response":"$RESPONSE","confidence":${CONFIDENCE:-null},"reasoning":${REASONING:+\"$REASONING\"}${REASONING:-null},"leverage":${LEVERAGE:-null},"txCount":1}
EOF
)

# Ensure directory exists
mkdir -p "$(dirname "$TRADE_LOG")"

echo "$ENTRY" >> "$TRADE_LOG"
echo "Signal posted: $ACTION $TOKEN @ \$$ENTRY_PRICE → $TRADE_LOG"
