#!/usr/bin/env bash
# ============================================================
# PROVA — Smoke-Test Cutover (APP-LANDING-SPLIT)
#
# Testet alle wichtigen URLs nach dem Domain-Split:
#   1. LANDING-Pages auf prova-systems.de (erwartet HTTP 200)
#   2. Cross-Domain-Redirects LANDING → APP (erwartet 301 + Ziel)
#   3. APP-Pages auf app.prova-systems.de (erwartet HTTP 200/301/302)
#
# Usage:
#   bash scripts/smoke-test-cutover.sh
#
# Optional Overrides (z.B. fuer Staging/Branch-Deploys):
#   LANDING_HOST=https://staging-landing.netlify.app \
#   APP_HOST=https://staging-app.netlify.app \
#   bash scripts/smoke-test-cutover.sh
#
# Exit-Codes:
#   0  alle Tests bestanden
#   1  mindestens ein Test fehlgeschlagen (CI-tauglich)
#
# Abhaengigkeiten:
#   curl, awk (Standard auf Linux/macOS, Windows: Git-Bash oder WSL)
# ============================================================

set -uo pipefail

# ─── Config ──────────────────────────────────────────────────
LANDING_HOST="${LANDING_HOST:-https://prova-systems.de}"
APP_HOST="${APP_HOST:-https://app.prova-systems.de}"
TIMEOUT="${TIMEOUT:-10}"      # curl --max-time in Sekunden
USER_AGENT="PROVA-Smoke-Test/1.0"

# ─── Output (mit ANSI-Farben wenn TTY) ───────────────────────
if [ -t 1 ]; then
  RED=$'\033[0;31m'
  GREEN=$'\033[0;32m'
  YELLOW=$'\033[0;33m'
  CYAN=$'\033[0;36m'
  BOLD=$'\033[1m'
  NC=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; CYAN=""; BOLD=""; NC=""
fi

PASS=0
FAIL=0
WARN=0
FAIL_LOG=""

# ─── Helpers ─────────────────────────────────────────────────

# probe_url <method> <url>
# Returns "STATUS LOCATION" via stdout. STATUS=000 bei Netzwerk-Fehler.
probe_url() {
  local method="$1"
  local url="$2"
  curl -s -o /dev/null \
       --max-time "$TIMEOUT" \
       --user-agent "$USER_AGENT" \
       -X "$method" \
       -w '%{http_code} %{redirect_url}\n' \
       "$url" 2>/dev/null || echo "000 -"
}

# pass <test-name>
pass() {
  PASS=$((PASS+1))
  printf '  %s✓%s %s\n' "$GREEN" "$NC" "$1"
}

# fail <test-name> <details>
fail() {
  FAIL=$((FAIL+1))
  FAIL_LOG="${FAIL_LOG}  - $1: $2\n"
  printf '  %s✗%s %s %s(%s)%s\n' "$RED" "$NC" "$1" "$RED" "$2" "$NC"
}

# warn <test-name> <details>
warn() {
  WARN=$((WARN+1))
  printf '  %s!%s %s %s(%s)%s\n' "$YELLOW" "$NC" "$1" "$YELLOW" "$2" "$NC"
}

# expect_200 <name> <url>
expect_200() {
  local name="$1"
  local url="$2"
  local resp status
  resp=$(probe_url GET "$url")
  status="${resp%% *}"
  case "$status" in
    200) pass "$name → 200" ;;
    000) fail "$name" "Netzwerk-Fehler / Timeout / DNS — $url" ;;
    *)   fail "$name" "expected 200, got $status — $url" ;;
  esac
}

# expect_redirect <name> <from-url> <expected-target-prefix> <expected-status>
expect_redirect() {
  local name="$1"
  local url="$2"
  local target_prefix="$3"
  local exp_status="${4:-301}"
  local resp status loc
  resp=$(probe_url GET "$url")
  status="${resp%% *}"
  loc="${resp#* }"

  if [ "$status" = "000" ]; then
    fail "$name" "Netzwerk-Fehler / Timeout / DNS — $url"
    return
  fi

  if [ "$status" != "$exp_status" ]; then
    fail "$name" "expected $exp_status, got $status — $url"
    return
  fi

  # Vergleich: Location-Header muss mit erwartetem Prefix beginnen.
  case "$loc" in
    "$target_prefix"*) pass "$name → $exp_status → $loc" ;;
    "")
      fail "$name" "$exp_status ohne Location-Header — $url"
      ;;
    *)
      fail "$name" "$exp_status, aber Location='$loc' (erwartet: '${target_prefix}*')"
      ;;
  esac
}

# expect_redirect_or_200 — fuer App-Pfade die je nach Auth-State 200 oder 302 liefern
# z.B. /dashboard ohne Cookie kann 200 liefern (rendered) oder 302 zu /login (server-side guard)
expect_redirect_or_200() {
  local name="$1"
  local url="$2"
  local resp status
  resp=$(probe_url GET "$url")
  status="${resp%% *}"
  case "$status" in
    200|301|302) pass "$name → $status (Auth-State-abhaengig OK)" ;;
    000)         fail "$name" "Netzwerk-Fehler / Timeout / DNS — $url" ;;
    *)           fail "$name" "expected 200/301/302, got $status — $url" ;;
  esac
}

# ─── Banner ──────────────────────────────────────────────────
printf '%s═══════════════════════════════════════════════════════════%s\n' "$CYAN" "$NC"
printf '%sPROVA Smoke-Test Cutover (APP-LANDING-SPLIT)%s\n' "$BOLD" "$NC"
printf '%s═══════════════════════════════════════════════════════════%s\n' "$CYAN" "$NC"
printf 'LANDING: %s\n' "$LANDING_HOST"
printf 'APP:     %s\n' "$APP_HOST"
printf 'Timeout: %ss\n\n' "$TIMEOUT"

# ─── 1. LANDING (200 erwartet) ───────────────────────────────
printf '%s[1/3] LANDING-Pages auf %s (erwartet HTTP 200)%s\n' "$BOLD" "$LANDING_HOST" "$NC"

expect_200 "Startseite (/)"             "$LANDING_HOST/"
expect_200 "Datenschutz (/datenschutz)" "$LANDING_HOST/datenschutz"
expect_200 "Impressum   (/impressum)"   "$LANDING_HOST/impressum"
expect_200 "AGB         (/agb)"         "$LANDING_HOST/agb"
expect_200 "AVV         (/avv)"         "$LANDING_HOST/avv"

# ─── 2. LANDING → APP REDIRECT (301 erwartet) ─────────────────
printf '\n%s[2/3] Cross-Domain-Redirects LANDING → APP (erwartet 301)%s\n' "$BOLD" "$NC"

expect_redirect "/login"               "$LANDING_HOST/login"               "$APP_HOST/login"     301
expect_redirect "/dashboard"           "$LANDING_HOST/dashboard"           "$APP_HOST/dashboard" 301
expect_redirect "/akte"                "$LANDING_HOST/akte"                "$APP_HOST/akte"      301
expect_redirect "/app-login.html"      "$LANDING_HOST/app-login.html"      "$APP_HOST/login"     301
expect_redirect "/auth-supabase.html"  "$LANDING_HOST/auth-supabase.html"  "$APP_HOST/login"     301

# Bonus-Checks fuer haeufige App-Pfade
expect_redirect "/briefe"              "$LANDING_HOST/briefe"              "$APP_HOST/briefe"    301
expect_redirect "/archiv"              "$LANDING_HOST/archiv"              "$APP_HOST/archiv"    301

# ─── 3. APP (200 erwartet — auth-frei testbar) ───────────────
printf '\n%s[3/3] APP-Pages auf %s%s\n' "$BOLD" "$APP_HOST" "$NC"

# /login ist die Public-Auth-Page → muss 200 liefern
expect_200 "Login-Page (/login)" "$APP_HOST/login"

# /dashboard ohne Cookie: client-seitiger auth-guard schickt User auf /login.
# Server-side liefert 200 (Page wird gerendert, JS uebernimmt). Akzeptieren auch 302.
expect_redirect_or_200 "Dashboard (/dashboard, ohne Auth)" "$APP_HOST/dashboard"

# App-Root → /dashboard (Marcel-Direktive: server-side 301)
expect_redirect "App-Root (/)" "$APP_HOST/" "$APP_HOST/dashboard" 301

# ─── Summary ─────────────────────────────────────────────────
TOTAL=$((PASS + FAIL + WARN))
printf '\n%s═══════════════════════════════════════════════════════════%s\n' "$CYAN" "$NC"
printf '%sErgebnis:%s ' "$BOLD" "$NC"
printf '%s%d PASS%s · ' "$GREEN" "$PASS" "$NC"
if [ "$FAIL" -gt 0 ]; then
  printf '%s%d FAIL%s · ' "$RED" "$FAIL" "$NC"
else
  printf '%d FAIL · ' "$FAIL"
fi
if [ "$WARN" -gt 0 ]; then
  printf '%s%d WARN%s · ' "$YELLOW" "$WARN" "$NC"
fi
printf '%d Tests insgesamt\n' "$TOTAL"

if [ "$FAIL" -gt 0 ]; then
  printf '\n%sFehlgeschlagene Tests:%s\n' "$RED" "$NC"
  printf '%b' "$FAIL_LOG"
  printf '\n%sCheckliste bei Fehlern:%s\n' "$YELLOW" "$NC"
  printf '  1. Ist %s als Domain-Alias in Netlify konfiguriert?\n' "$APP_HOST"
  printf '  2. DNS fuer app-Subdomain propagiert? (dig app.prova-systems.de)\n'
  printf '  3. netlify.toml + _redirects deployed? (sprint-app-landing-split)\n'
  printf '  4. login.html im Repo-Root vorhanden? (Phase 3 Block 3c)\n'
  printf '  5. Bei /pricing-FAILs: feature/landing-pricing-kontakt gemerged?\n'
  exit 1
fi

printf '\n%s✓ Alle Tests bestanden — Cutover sieht gut aus.%s\n' "$GREEN" "$NC"
exit 0
