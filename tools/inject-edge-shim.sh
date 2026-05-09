#!/usr/bin/env bash
# ============================================================
# PROVA Systems — Auto-Injection of lib/edge-shim.js into HTML pages
# MEGA⁴⁵
#
# Pattern:
#   1. Wenn HTML <script src=".../prova-config.js"> enthält:
#      → edge-shim.js direkt danach einfügen (gleiches src-Format)
#   2. Wenn HTML /.netlify/functions/* aufruft aber kein prova-config.js:
#      → edge-shim.js vor </head> einfügen (mit /lib/edge-shim.js Pfad)
#   3. Idempotent: Wenn edge-shim.js schon drin → skip
#
# Usage:  bash tools/inject-edge-shim.sh
# Skips:  docs/, node_modules/, tools/, tests/, .git/, playwright-report-m42/
# ============================================================
set -uo pipefail

SHIM_TAG_REL='<script src="lib/edge-shim.js"></script>'
SHIM_TAG_ABS='<script src="/lib/edge-shim.js"></script>'

INJECTED=0
SKIPPED_ALREADY=0
SKIPPED_NO_CONFIG_NO_NETLIFY=0
ERRORED=0

# Find HTML files in scope
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
    # Idempotent: schon drin?
    if grep -q 'edge-shim\.js' "$f"; then
        SKIPPED_ALREADY=$((SKIPPED_ALREADY+1))
        continue
    fi

    has_config=0
    has_netlify=0
    grep -q 'prova-config\.js' "$f" && has_config=1
    grep -qE '/\.netlify/functions/' "$f" && has_netlify=1

    if [ "$has_config" = "0" ] && [ "$has_netlify" = "0" ]; then
        SKIPPED_NO_CONFIG_NO_NETLIFY=$((SKIPPED_NO_CONFIG_NO_NETLIFY+1))
        continue
    fi

    if [ "$has_config" = "1" ]; then
        # Modus 1: nach prova-config.js Zeile einfügen.
        # Format-Erkennung: ist der prova-config.js-src-Pfad relativ (lib/...) oder absolut (/lib/...)?
        if grep -qE '<script[^>]*src="/lib/prova-config\.js"' "$f"; then
            shim="$SHIM_TAG_ABS"
        else
            shim="$SHIM_TAG_REL"
        fi
        # sed-insert direkt nach Match-Zeile (mit Indent-Match)
        # Awk ist robuster für Indent-Erhalt + Multi-OS
        awk -v shim="$shim" '
            { print }
            !inserted && /prova-config\.js/ {
                # Indent der aktuellen Zeile übernehmen
                match($0, /^[ \t]*/)
                indent = substr($0, 1, RLENGTH)
                print indent shim
                inserted = 1
            }
        ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
        if [ $? -eq 0 ]; then
            INJECTED=$((INJECTED+1))
            echo "  ✓ [config] $f"
        else
            ERRORED=$((ERRORED+1))
            echo "  ✗ [config] $f (awk failed)"
        fi
    else
        # Modus 2: vor </head> einfügen mit absolutem Pfad
        if ! grep -qi '</head>' "$f"; then
            SKIPPED_NO_CONFIG_NO_NETLIFY=$((SKIPPED_NO_CONFIG_NO_NETLIFY+1))
            echo "  - [skip-no-head] $f (kein </head>, no inject)"
            continue
        fi
        awk -v shim="$SHIM_TAG_ABS" '
            !inserted && /<\/head>/ {
                # Indent der </head>-Zeile übernehmen
                match($0, /^[ \t]*/)
                indent = substr($0, 1, RLENGTH)
                print indent "  " shim
                inserted = 1
            }
            { print }
        ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
        if [ $? -eq 0 ]; then
            INJECTED=$((INJECTED+1))
            echo "  ✓ [head] $f"
        else
            ERRORED=$((ERRORED+1))
            echo "  ✗ [head] $f (awk failed)"
        fi
    fi
done

echo ""
echo "════════════════════════════════════════════════"
echo " Injected:                    $INJECTED"
echo " Skipped (schon drin):        $SKIPPED_ALREADY"
echo " Skipped (kein Bedarf):       $SKIPPED_NO_CONFIG_NO_NETLIFY"
echo " Errored:                     $ERRORED"
echo "════════════════════════════════════════════════"

[ "$ERRORED" -gt 0 ] && exit 1
exit 0
