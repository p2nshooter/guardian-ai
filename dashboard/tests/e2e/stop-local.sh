#!/usr/bin/env bash
# Stop every local e2e wrangler server (by listening port and by process name).
for pid in $(ps -eo pid=,args= | awk '$0 ~ /wrangler/ && $0 ~ /pages dev static/ {print $1}'); do
  [ "$pid" != "$$" ] && kill "$pid" 2>/dev/null
done
sleep 1
