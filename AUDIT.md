# Codex Audit - Feb 20, 2026
## 22 issues found. Fixing in priority order.

### CRITICAL (2)
1. No auth on provider registration - anyone can spoof any wallet
2. No auth on signal publish/patch - anyone can post signals for any provider

### HIGH (7)  
3. File writes fail on Vercel serverless (providers.ts)
4. Race conditions on read-modify-write JSON
5. Hardcoded single provider in getProviderStats()
6. Trade pairing only handles BUY->SELL, ignores LONG/SHORT lifecycle
7. Unmatched SELL treated as synthetic short
8. Equity curve places PnL at entry time, not close time
9. Missing input validation + javascript: URL injection risk

### MEDIUM (11)
10. Unweighted PnL aggregation (sums raw percentages)
11. Win rate includes open trades
12. Token extraction regex too narrow
13. Best/Worst trade shows same trade + "+-0.6%" formatting
14. Falsy check treats 0 PnL as missing
15. RelativeTimestamp interval leak
16. Feed uses random mock sparkline/confidence/reasoning
17. Chart divides by zero for single-point series
18. Unbounded limit param on signals API
19. Repeated getProviders() disk I/O
20. trade-data.json in /public exposes raw prompts/responses

### LOW (2)
21. Comma removal only strips first comma in prices
22. Symbol casing mismatches (cbBTC, USDbC)
