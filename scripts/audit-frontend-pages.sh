#!/bin/bash
# ============================================================
# PROVA — Frontend-Pages Audit für K-1.4
# Sprint K-1.4 Bulk-Helper
#
# Zeigt pro HTML-Page:
#   - alte Auth-Imports (prova-fetch-auth, auth-guard, prova-auth-api,
#     prova-sv-airtable)
#   - Backend-Calls (airtableProxy, /.netlify/functions/...)
#   - ob lib/prova-config.js schon eingebunden
#
# Usage:
#   bash scripts/audit-frontend-pages.sh           # Tabelle aller Pages
#   bash scripts/audit-frontend-pages.sh --legacy  # nur Pages mit alter Auth
#   bash scripts/audit-frontend-pages.sh page.html # nur eine Page
# ============================================================

set -e
cd "$(dirname "$0")/.."

ONLY_LEGACY=0
SINGLE=""
for arg in "$@"; do
    case "$arg" in
        --legacy) ONLY_LEGACY=1 ;;
        *.html)   SINGLE="$arg" ;;
    esac
done

PAGES=$([ -n "$SINGLE" ] && echo "$SINGLE" || ls *.html 2>/dev/null | grep -v -E '^(404|account-gesperrt|admin-login)')

printf "%-40s %-7s %-8s %-7s %-7s %s\n" "Page" "old-auth" "supabase" "airtable" "netlify" "Status"
printf '%.s─' {1..100}; echo

for p in $PAGES; do
    [ -f "$p" ] || continue
    legacy=$(grep -cE 'prova-fetch-auth|auth-guard\.js|prova-auth-api\.js|prova-sv-airtable\.js' "$p" 2>/dev/null | head -1)
    supabase=$(grep -cE 'lib/prova-config|lib/supabase-client|lib/auth-guard\.js' "$p" 2>/dev/null | head -1)
    airtable=$(grep -cE 'airtableProxy|/airtable\.js' "$p" 2>/dev/null | head -1)
    netlify=$(grep -cE '/\.netlify/functions/' "$p" 2>/dev/null | head -1)
    legacy=${legacy:-0}; supabase=${supabase:-0}; airtable=${airtable:-0}; netlify=${netlify:-0}

    if [ "$ONLY_LEGACY" = "1" ] && [ "$legacy" -eq 0 ]; then continue; fi

    if [ "$legacy" -eq 0 ] && [ "$supabase" -gt 0 ]; then
        status="✅ supabase"
    elif [ "$legacy" -gt 0 ] && [ "$supabase" -eq 0 ]; then
        status="⏳ legacy"
    elif [ "$legacy" -gt 0 ] && [ "$supabase" -gt 0 ]; then
        status="🔀 hybrid"
    else
        status="📄 static"
    fi

    printf "%-40s %-7s %-8s %-7s %-7s %s\n" "$p" "$legacy" "$supabase" "$airtable" "$netlify" "$status"
done

echo
echo "Legend:"
echo "  old-auth  count: prova-fetch-auth + auth-guard + prova-auth-api + prova-sv-airtable"
echo "  supabase  count: lib/prova-config + lib/supabase-client + lib/auth-guard"
echo "  airtable  count: airtableProxy() + airtable.js refs"
echo "  netlify   count: /.netlify/functions/ refs"
echo
echo "✅ supabase  — fully migrated"
echo "⏳ legacy    — old auth, needs refactor (see docs/K-1-4-PAGE-MIGRATION-GUIDE.md)"
echo "🔀 hybrid    — both auth-stacks present, transition state"
echo "📄 static    — no auth needed (404, public pages)"
