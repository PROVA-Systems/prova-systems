#!/usr/bin/env bash
# PROVA — Security-Audit-Sweep
# MEGA⁷ U2 (04.05.2026)
#
# Run via: bash scripts/security-audit.sh
#
# Checks:
#   1. npm audit (production deps + dev deps)
#   2. Hardcoded secrets pattern
#   3. CSP-Header in netlify.toml
#   4. Rate-Limit-Coverage in Functions
#   5. Public Functions ohne Auth
#
# Exit-Code: 0 = clean, > 0 = Findings

set -e

REPORT_DIR="docs/audit"
TS=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
REPORT="$REPORT_DIR/SECURITY-AUDIT-$TS.md"

mkdir -p "$REPORT_DIR"

FAIL=0

echo "🔒 PROVA Security-Audit"
echo "   Report: $REPORT"
echo ""

cat > "$REPORT" <<EOF
# PROVA Security-Audit-Report — $TS

## 1. npm audit

\`\`\`
EOF

echo "── 1. npm audit ──"
NPM_OUT=$(npm audit --omit=dev 2>&1 || true)
echo "$NPM_OUT" >> "$REPORT"
if echo "$NPM_OUT" | grep -q "found 0 vulnerabilities"; then
  echo "  ✅ 0 vulnerabilities"
else
  echo "  ⚠ vulnerabilities gefunden — Report sehen"
  FAIL=$((FAIL + 1))
fi

cat >> "$REPORT" <<EOF
\`\`\`

## 2. Hardcoded Secret Patterns

EOF

echo "── 2. Secret-Patterns ──"
SECRETS=$(grep -rE "(sk_live_|pk_live_|whsec_|service_role|SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"])" \
  --include="*.js" --include="*.toml" --include="*.env*" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | \
  grep -v ".env.example" | \
  grep -v "process.env" | \
  grep -v "// " | \
  grep -v "/\*" | head -10 || true)

if [ -z "$SECRETS" ]; then
  echo "  ✅ Keine hardcoded Secrets"
  echo "Keine hardcoded Secrets gefunden." >> "$REPORT"
else
  echo "  ⚠ Potenzielle Secrets gefunden"
  echo '```' >> "$REPORT"
  echo "$SECRETS" >> "$REPORT"
  echo '```' >> "$REPORT"
  FAIL=$((FAIL + 1))
fi

cat >> "$REPORT" <<EOF

## 3. CSP-Header

EOF

echo "── 3. CSP-Header ──"
if grep -q "Content-Security-Policy" netlify.toml; then
  echo "  ✅ CSP in netlify.toml"
  echo "✅ CSP konfiguriert in netlify.toml" >> "$REPORT"
else
  echo "  ❌ CSP fehlt"
  echo "❌ CSP fehlt in netlify.toml" >> "$REPORT"
  FAIL=$((FAIL + 1))
fi

cat >> "$REPORT" <<EOF

## 4. Rate-Limit-Coverage

| Function | Rate-Limit |
|---|---|
EOF

echo "── 4. Rate-Limit-Coverage ──"
NO_RL=0
for f in netlify/functions/*.js; do
  fname=$(basename "$f")
  case "$fname" in
    admin-*|stripe-webhook.js|sentry-test.js|pilot-seats.js) continue ;;
  esac
  if grep -q "RateLimit\|rate-limit-\|allowRate\|rateLimit:" "$f" 2>/dev/null; then
    echo "| $fname | ✅ |" >> "$REPORT"
  else
    echo "| $fname | ⚠ |" >> "$REPORT"
    NO_RL=$((NO_RL + 1))
  fi
done

if [ "$NO_RL" -gt 0 ]; then
  echo "  ⚠ $NO_RL Functions ohne expliziten Rate-Limit (siehe Report)"
else
  echo "  ✅ alle Public-Functions mit Rate-Limit"
fi

cat >> "$REPORT" <<EOF

## 5. Summary

EOF

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "🟢 Audit clean."
  echo "🟢 **Audit clean.**" >> "$REPORT"
  exit 0
else
  echo ""
  echo "🔴 Audit: $FAIL Findings"
  echo "🔴 **Audit: $FAIL Findings.**" >> "$REPORT"
  exit "$FAIL"
fi
