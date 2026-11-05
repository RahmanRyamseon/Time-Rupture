#!/usr/bin/env bash
# Run the full collector by hand, e.g. for a long backfill on your own machine.
# The scheduled GitHub Action does not need this; it runs scripts/update.mjs directly.
#
# Start it detached in tmux so it survives a closed terminal or a dropped SSH session:
#   tmux new -d -s cables-crawl 'bash cables-market-watch/scripts/collect.sh'
# Watch it without attaching:
#   tmux capture-pane -t cables-crawl -p | tail -20
#   tmux has-session -t cables-crawl 2>/dev/null && echo running || echo done
# Stop it cleanly (it finishes the current source and saves a checkpoint):
#   tmux send-keys -t cables-crawl C-c
# Continue an interrupted run within 6 hours:
#   tmux new -d -s cables-crawl 'bash cables-market-watch/scripts/collect.sh --resume'
#
# Every line also goes to cables-market-watch/logs/collector-YYYY-MM-DD.log, and the per-source
# results to cables-market-watch/data/run-report.json.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/update.mjs "$@"
