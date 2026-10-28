#!/usr/bin/env bash
# Shows what this machine is listening on and flags anything reachable from outside it. Run it while the receiver is up.
# Expected: ComfyUI (8188) and the gateway (4173) on 127.0.0.1 only. cloudflared makes outbound connections and listens on nothing public.
set -uo pipefail
echo "== listening TCP sockets"
if command -v ss >/dev/null 2>&1; then
  ss -ltnH 2>/dev/null | awk '{print $4}' | sort -u
else
  lsof -iTCP -sTCP:LISTEN -nP 2>/dev/null | awk 'NR>1 {print $9}' | sort -u
fi | tee /tmp/osc-listeners.$$ >/dev/null
cat /tmp/osc-listeners.$$
echo
bad=0
while read -r addr; do
  case "$addr" in 127.0.0.1:*|"[::1]:"*|::1:*|localhost:*) ;; *) echo "NOT LOOPBACK: $addr"; bad=1 ;; esac
done < /tmp/osc-listeners.$$
for port in 4173 8188; do
  if grep -q ":$port\$" /tmp/osc-listeners.$$; then
    grep ":$port\$" /tmp/osc-listeners.$$ | grep -Eq '^(127\.0\.0\.1|\[::1\]|::1|localhost):' && echo "ok: port $port is loopback only" || { echo "EXPOSED: port $port is not loopback only"; bad=1; }
  fi
done
rm -f /tmp/osc-listeners.$$
echo
echo "Anything marked NOT LOOPBACK that is not ours (other services on this machine) is outside this receiver; only 4173 and 8188 are ours."
exit $bad
