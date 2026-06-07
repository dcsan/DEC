#!/usr/bin/env bash
# Domain availability checker. RDAP for gTLDs, whois fallback for ccTLDs.
# Usage: ./check-domains.sh name1 name2 ...   (checks each across TLD list)
set -u

RDAP_TLDS=" com net xyz club app biz dev foo fyi run today vip zone ai "
CCTLDS=" sh co me io "
TLDS="${TLDS:-com app ai}"   # override with: TLDS="com net app ..." ./check-domains.sh

check_rdap() { # name.tld -> FREE / TAKEN  (with retry/backoff for 429/000)
  local code try
  for try in 1 2 3 4; do
    code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 10 "https://rdap.org/domain/$1")
    case "$code" in
      404) echo FREE; return ;;
      200) echo TAKEN; return ;;
      429|000) sleep $((try * 2)) ;;   # rate-limited / transient — back off
      *)   echo "??($code)"; return ;;
    esac
  done
  echo "??($code)"
}
check_whois() {
  local out
  out=$(whois "$1" 2>/dev/null)
  if echo "$out" | grep -qiE "no match|not found|no data found|status:\s*free|no entries found"; then
    echo FREE
  elif echo "$out" | grep -qiE "creation date|registrar:|domain status|registered"; then
    echo TAKEN
  else
    echo "??"
  fi
}

for name in "$@"; do
  ln=$(echo "$name" | tr '[:upper:]' '[:lower:]')
  line="$ln:"
  for tld in $TLDS; do
    if [[ "$RDAP_TLDS" == *" $tld "* ]]; then
      r=$(check_rdap "$ln.$tld")
    else
      r=$(check_whois "$ln.$tld")
    fi
    [[ "$r" == FREE ]] && line="$line  .$tld=✅" || line="$line  .$tld=$r"
    sleep 0.7   # throttle to avoid rdap.org rate limits
  done
  echo "$line"
done
