#!/bin/bash
# Starts the app with the env one scene needs, records it, stops the app. Silent; no model calls except "live" (3).
# Usage: PW=/path/to/node_modules/playwright docs/video/record.sh <live|fault|long>
set -u
cd "$(dirname "$0")/../.."
case "$1" in
  live)  PORT=3111; ENVS="RECORD=0 DAILY_CALL_CAP=4";;
  fault) PORT=3112; ENVS="REPLAY=1 FAULT=compare:overloaded:2";;
  long)  PORT=3113; ENVS="REPLAY=1";;
  *) echo "scene?"; exit 2;;
esac
env $ENVS npx next dev -p $PORT > docs/video/raw/$1.server.log 2>&1 &
SRV=$!
for i in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 1; done
node docs/video/record.mjs "$1" $PORT; RC=$?
pkill -P $SRV 2>/dev/null; kill $SRV 2>/dev/null
lsof -ti tcp:$PORT | xargs kill 2>/dev/null
exit $RC
