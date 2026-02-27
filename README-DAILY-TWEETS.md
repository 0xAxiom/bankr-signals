# Daily Tweet Automation

Automated daily Twitter posting for bankr-signals to increase engagement and platform visibility.

## Overview

The daily tweet system automatically posts engaging content about trading signals, performance highlights, and platform updates once per day.

## Endpoint

**URL:** `/api/cron/daily-tweet`  
**Method:** POST (for cron execution)  
**Auth:** Bearer token via `CRON_SECRET` environment variable

## Tweet Types

1. **Signal Spotlight** - Highlights the best performing signal of the day
2. **Performance Update** - Weekly performance summary of top traders  
3. **Market Insight** - Market sentiment based on recent signals
4. **Brand Messages** - Fallback content about platform features

## Usage

### Manual Testing
```bash
# Preview what would be posted
curl "https://bankrsignals.com/api/cron/daily-tweet?preview=true"

# Test run (no actual posting)  
curl "https://bankrsignals.com/api/cron/daily-tweet?test=true"
```

### Production Cron
```bash
# Set up daily cron job (9 AM PT)
0 17 * * * curl -X POST "https://bankrsignals.com/api/cron/daily-tweet" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Content Strategy

**Smart Content Selection:**
- Prioritizes signal spotlights when profitable signals are available
- Falls back to performance updates for weekly summaries
- Uses brand messaging when no recent activity

**Engagement Features:**
- Mentions provider Twitter handles when available
- Includes performance metrics and reasoning
- Links back to relevant platform pages
- Uses emojis and hashtags for visibility

## Implementation Details

**Dependencies:**
- Uses existing `tweet-draft` API for intelligent content generation
- Integrates with `~/clawd/scripts/twitter.sh` for actual posting
- Falls back gracefully when external APIs are unavailable

**Error Handling:**
- Comprehensive logging of success/failure states
- Fallback content when primary sources fail
- Proper HTTP status codes and error messages

## Monitoring

Check cron job status:
```bash
# View recent execution results
curl "https://bankrsignals.com/api/cron/daily-tweet" | jq
```

Expected response includes:
- Tweet content and type
- Execution time
- Success/failure status
- Posted tweet URL (on success)