#!/bin/bash

# Daily Signal Tweet Automation Script
# Automatically posts the signal of the day to Twitter

set -e

cd "$(dirname "$0")/.."

# Get Twitter credentials from keychain
export AUTO_POST=true
export TWITTER_BEARER_TOKEN=$(security find-generic-password -a axiom -s openclaw.TWITTER_BEARER_TOKEN -w)

# Log the start
echo "$(date '+%Y-%m-%d %H:%M:%S') === Daily Signal Tweet Automation Started ===" >> scripts/daily-tweets.log

# Run the tweet script
node scripts/daily-signal-tweet.js >> scripts/daily-tweets.log 2>&1

# Log completion
echo "$(date '+%Y-%m-%d %H:%M:%S') === Daily Signal Tweet Automation Completed ===" >> scripts/daily-tweets.log