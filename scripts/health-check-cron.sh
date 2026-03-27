#!/bin/bash

# Health Check Cron for Bankr Signals
# Runs health check and alerts if critical issues detected
# Usage: Add to crontab with: */30 * * * * /path/to/bankrsignals/scripts/health-check-cron.sh

set -e

cd "$(dirname "$0")/.."

LOG_FILE="logs/health-check.log"
ALERT_FILE="logs/health-alerts.log"

# Ensure log directories exist
mkdir -p logs

# Run health check and capture output
echo "$(date): Running health check" >> "$LOG_FILE"

if node scripts/health-check.js >> "$LOG_FILE" 2>&1; then
    echo "$(date): Health check completed successfully" >> "$LOG_FILE"
    
    # Check if any health check JSON files were created (indicates completion)
    LATEST_HEALTH_FILE=$(ls -t health-check-*.json 2>/dev/null | head -1)
    
    if [[ -n "$LATEST_HEALTH_FILE" ]]; then
        # Parse the results to check overall status
        OVERALL_STATUS=$(node -e "
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('$LATEST_HEALTH_FILE', 'utf8'));
            console.log(data.overall);
        " 2>/dev/null || echo "unknown")
        
        echo "$(date): Overall status: $OVERALL_STATUS" >> "$LOG_FILE"
        
        # Alert on critical issues
        if [[ "$OVERALL_STATUS" == "critical" ]]; then
            ALERT_MSG="$(date): CRITICAL - Bankr Signals health check failed. Multiple endpoints down."
            echo "$ALERT_MSG" >> "$ALERT_FILE"
            echo "$ALERT_MSG"
            
            # Optional: Send alert (uncomment and configure as needed)
            # curl -X POST "https://hooks.slack.com/your/webhook" \
            #   -d '{"text":"🚨 Bankr Signals CRITICAL health issues detected"}'
        fi
        
        # Clean up old health check files (keep last 10)
        ls -t health-check-*.json 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
        
    else
        echo "$(date): Warning - No health check results file found" >> "$LOG_FILE"
    fi
    
else
    ALERT_MSG="$(date): ERROR - Health check script failed to run"
    echo "$ALERT_MSG" >> "$ALERT_FILE"
    echo "$ALERT_MSG"
fi

# Clean up old log files (keep last 7 days)
find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true