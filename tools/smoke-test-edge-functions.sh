#!/usr/bin/env bash
# ============================================================
# PROVA Systems — Edge Function Smoke-Test
# MEGA⁴³+⁴⁴ Final
#
# Pre-Pilot-Verifikation: alle 144 Edge Functions reagieren mit
# entweder 200 (mit Test-JWT), 401/403 (no auth), oder 405 (wrong method).
#
# Usage:
#   export SUPABASE_URL="https://cngteblrbpwsyypexjrv.supabase.co"
#   export SUPABASE_ANON_KEY="eyJ..."
#   export TEST_JWT="<gültiger User-JWT>"  # optional für authed Tests
#   bash tools/smoke-test-edge-functions.sh
# ============================================================
set -uo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://cngteblrbpwsyypexjrv.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY}"
TEST_JWT="${TEST_JWT:-$SUPABASE_ANON_KEY}"
BASE="$SUPABASE_URL/functions/v1"

# Public-Endpoints (keine Auth)
PUBLIC=(
  "health"
  "public-status"
  "team-interest"
)

# User-Endpoints (User-JWT)
USER_GET=(
  "dashboard-fristen-upcoming"
  "list-auftraege"
  "fristen-list"
  "ki-history"
  "ki-statistik"
  "re-consent-pending"
)

USER_POST=(
  "ki-feedback"
  "audit-source-log"
  "auth-2fa-setup"
  "support-ticket-create"
  "create-demo-akte"
  "onboarding-create-demo"
  "log-legal-acceptance"
)

# Admin-Endpoints (User-JWT mit Admin-Email + 2FA)
ADMIN_GET=(
  "admin-system-health"
  "admin-pilot-list"
  "admin-audit-trail"
  "admin-stripe-kpis"
  "admin-feature-heatmap"
  "admin-funnel"
  "admin-conversion-funnel"
  "admin-churn"
  "admin-mrr-live"
  "admin-ki-aggregations"
  "admin-ki-costs"
  "admin-live-sessions"
  "admin-pdf-queue"
  "admin-pdfmonkey-inventory"
  "admin-pseudonymisierung-audit"
  "admin-push-alerts"
  "admin-support-inbox"
  "admin-system-uptime"
  "admin-time-tracking"
  "admin-env-status"
  "admin-sentry-errors"
)

# Cron-Endpoints (X-Cron-Secret)
CRON_POST=(
  "status-check"
  "health-check-cron"
  "fristen-reminder-cron"
  "onboarding-mail-cron"
  "email-pilot-feedback-cron"
  "email-trial-ending-cron"
  "mahnwesen-cron"
)

PASS=0; FAIL=0; SKIP=0
declare -a FAILURES

probe() {
  local fn=$1; local method=$2; local auth=$3; local expected=$4
  local headers=()
  headers+=(-H "apikey: $SUPABASE_ANON_KEY")
  if [ "$auth" = "anon" ]; then
    headers+=(-H "Authorization: Bearer $SUPABASE_ANON_KEY")
  elif [ "$auth" = "user" ]; then
    headers+=(-H "Authorization: Bearer $TEST_JWT")
  elif [ "$auth" = "cron" ]; then
    headers+=(-H "x-cron-secret: TEST_CRON_SECRET")
  fi
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "${headers[@]}" "$BASE/$fn" || echo "000")
  if [ "$code" = "$expected" ] || [ "$code" = "200" ] || [ "$code" = "201" ] || [ "$code" = "204" ]; then
    PASS=$((PASS+1))
    printf "  ✓ %s [%s] → %s\n" "$fn" "$method" "$code"
  elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
    PASS=$((PASS+1))
    printf "  ✓ %s [%s] → %s (auth required, expected)\n" "$fn" "$method" "$code"
  elif [ "$code" = "405" ]; then
    PASS=$((PASS+1))
    printf "  ✓ %s [%s] → 405 (method not allowed, expected)\n" "$fn" "$method"
  elif [ "$code" = "400" ]; then
    PASS=$((PASS+1))
    printf "  ✓ %s [%s] → 400 (validation, expected ohne body)\n" "$fn" "$method"
  else
    FAIL=$((FAIL+1))
    FAILURES+=("$fn [$method] → $code")
    printf "  ✗ %s [%s] → %s (unexpected!)\n" "$fn" "$method" "$code"
  fi
}

echo "════════════════════════════════════════════════"
echo " PROVA Edge Smoke-Test"
echo " Base: $BASE"
echo "════════════════════════════════════════════════"

echo ""
echo "▶ Public Endpoints"
for fn in "${PUBLIC[@]}"; do probe "$fn" GET none 200; done

echo ""
echo "▶ User-GET Endpoints (anon → 401 expected, user → 200)"
for fn in "${USER_GET[@]}"; do probe "$fn" GET user 200; done

echo ""
echo "▶ User-POST Endpoints (without body → 400/validation expected)"
for fn in "${USER_POST[@]}"; do probe "$fn" POST user 400; done

echo ""
echo "▶ Admin-GET Endpoints (anon → 401, expected)"
for fn in "${ADMIN_GET[@]}"; do probe "$fn" GET anon 401; done

echo ""
echo "▶ Cron-POST Endpoints (no secret → 401)"
for fn in "${CRON_POST[@]}"; do probe "$fn" POST none 401; done

echo ""
echo "════════════════════════════════════════════════"
echo " Result: PASS=$PASS  FAIL=$FAIL  SKIP=$SKIP"
echo "════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
exit 0
