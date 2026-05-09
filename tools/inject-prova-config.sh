#!/usr/bin/env bash
# ============================================================
# PROVA Systems — Auto-Injection of lib/prova-config.js
# MEGA⁴⁸ Login-Bug-Fix
#
# Bug: 18 HTMLs hatten edge-shim.js (MEGA⁴⁵-Inject) aber kein
# prova-config.js → window.PROVA_CONFIG undefined → Login bricht
# mit "PROVA: window.PROVA_CONFIG.SUPABASE_URL fehlt".
#
# Fix: prova-config.js DIREKT VOR edge-shim.js einfügen.
# Idempotent (skip wenn schon drin).
#
# Usage: bash tools/inject-prova-config.sh
# ============================================================
set -uo pipefail

SHIM_TAG_REL='<script src="lib/edge-shim.js"></script>'
SHIM_TAG_ABS='<script src="/lib/edge-shim.js"></script>'

INJECTED=0
SKIPPED_ALREADY=0
SKIPPED_NO_SHIM=0
ERRORED=0

mapfile -t FILES < <(find . -type f -name "*.html" \
    -not -path "./node_modules/*" \
    -not -path "./docs/*" \
    -not -path "./tools/*" \
    -not -path "./tests/*" \
    -not -path "./playwright-report-m42/*" \
    -not -path "./.git/*" \
    | sort)

echo "Scope: ${#FILES[@]} HTML files"
echo ""

for f in "${FILES[@]}"; do
    # 1. Skip wenn schon drin
    if grep -q 'prova-config\.js' "$f"; then
        SKIPPED_ALREADY=$((SKIPPED_ALREADY+1))
        continue
    fi

    # 2. Skip wenn kein edge-shim.js (kein Bedarf für config)
    if ! grep -q 'edge-shim\.js' "$f"; then
        SKIPPED_NO_SHIM=$((SKIPPED_NO_SHIM+1))
        continue
    fi

    # 3. Format-Detection (relativ vs. absolut) basierend auf edge-shim-Pfad
    if grep -qE '<script[^>]*src="/lib/edge-shim\.js"' "$f"; then
        config_tag='<script src="/lib/prova-config.js"></script>'
    else
        config_tag='<script src="lib/prova-config.js"></script>'
    fi

    # 4. Awk-insert: VOR dem edge-shim.js Match-Line
    awk -v config="$config_tag" '
        !inserted && /edge-shim\.js/ {
            match($0, /^[ \t]*/)
            indent = substr($0, 1, RLENGTH)
            print indent config
            inserted = 1
        }
        { print }
    ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"

    if [ $? -eq 0 ]; then
        INJECTED=$((INJECTED+1))
        echo "  ✓ $f"
    else
        ERRORED=$((ERRORED+1))
        echo "  ✗ $f (awk failed)"
    fi
done

echo ""
echo "════════════════════════════════════════════════"
echo " Injected:                $INJECTED"
echo " Skipped (schon drin):    $SKIPPED_ALREADY"
echo " Skipped (kein shim):     $SKIPPED_NO_SHIM"
echo " Errored:                 $ERRORED"
echo "════════════════════════════════════════════════"

[ "$ERRORED" -gt 0 ] && exit 1
exit 0
