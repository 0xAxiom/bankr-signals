#!/bin/bash
# Update skill.md and heartbeat.md
# Route handlers serve from project root: SKILL.md and HEARTBEAT.md
# DO NOT put these in public/ — the route handlers won't read from there
set -euo pipefail
echo "Skill: $(wc -l < SKILL.md) lines"
echo "Heartbeat: $(wc -l < HEARTBEAT.md) lines"
echo "Route handlers serve from project root (SKILL.md, HEARTBEAT.md)"
echo "After editing, commit and deploy: git push && vercel --prod"
