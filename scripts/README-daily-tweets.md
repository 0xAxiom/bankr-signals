# Daily Signal Tweets

Automatically tweet the "Signal of the Day" from bankrsignals.com to drive engagement and traffic.

## Setup

The script automatically fetches the top signal using the enhanced selection algorithm and formats it for Twitter.

```bash
# Test the tweet generation (doesn't post)
node scripts/daily-signal-tweet.js --dry-run

# Post live tweet
node scripts/daily-signal-tweet.js
```

## Automation

Add to cron for daily automation:

```bash
# Tweet at 9 AM Pacific every day
0 16 * * * cd /Users/axiom/Github/bankr-signals && /usr/local/bin/node scripts/daily-signal-tweet.js >> scripts/daily-tweets.log 2>&1
```

## Features

- Fetches best signal using the same algorithm as the website
- Automatically formats for Twitter with performance data
- Includes provider name, signal details, and reasoning
- Gracefully handles days with no signals
- Logs all activity to `scripts/signal-of-day.log`
- Supports dry-run mode for testing

## Tweet Format

```
🔥 Signal of the Day

[Provider]: [Leverage]x [Action] [Token] → [Performance]

💭 "[Reasoning excerpt]"

📊 More signals: bankrsignals.com
```

The script ensures tweets stay under 280 characters and automatically truncates reasoning if needed.