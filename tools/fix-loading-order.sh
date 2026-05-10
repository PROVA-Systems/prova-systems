#!/usr/bin/env bash
# ============================================================
# PROVA Systems — Loading-Order-Fix MEGA⁵⁷
# Bewegt prova-fetch-auth.js NACH /lib/edge-shim.js in allen HTMLs.
# Pflicht: edge-shim muss window.fetch patchen BEVOR prova-fetch-auth lädt.
#
# Idempotent: skip wenn pfauth schon NACH edge-shim ist oder nicht gefunden.
# ============================================================
set -uo pipefail

FIXED=0
SKIPPED_ALREADY_OK=0
SKIPPED_NO_EDGE_SHIM=0
SKIPPED_NO_PFAUTH=0
ERRORED=0

mapfile -t FILES < <(find . -type f -name "*.html" \
    -not -path "./node_modules/*" \
    -not -path "./docs/*" \
    -not -path "./tools/*" \
    -not -path "./tests/*" \
    -not -path "./playwright-report-m42/*" \
    -not -path "./.git/*" \
    | sort)

for f in "${FILES[@]}"; do
    pf_line=$(grep -n 'src="prova-fetch-auth\.js"\|src="/prova-fetch-auth\.js"' "$f" | head -1 | cut -d: -f1)
    es_line=$(grep -n 'src="/lib/edge-shim\.js"\|src="lib/edge-shim\.js"' "$f" | head -1 | cut -d: -f1)

    if [ -z "$pf_line" ]; then
        SKIPPED_NO_PFAUTH=$((SKIPPED_NO_PFAUTH+1))
        continue
    fi
    if [ -z "$es_line" ]; then
        SKIPPED_NO_EDGE_SHIM=$((SKIPPED_NO_EDGE_SHIM+1))
        continue
    fi

    if [ "$pf_line" -gt "$es_line" ]; then
        SKIPPED_ALREADY_OK=$((SKIPPED_ALREADY_OK+1))
        continue
    fi

    # pfauth < edge-shim → reorder
    pf_content=$(sed -n "${pf_line}p" "$f")
    # delete pfauth line
    sed -i "${pf_line}d" "$f"
    # es_line shifted by -1 (one line removed above)
    new_es_line=$((es_line - 1))
    # insert pfauth AFTER edge-shim line
    awk -v target="$new_es_line" -v inject="$pf_content" 'NR==target { print; print inject; next } { print }' "$f" > "$f.tmp" && mv "$f.tmp" "$f"

    if [ $? -eq 0 ]; then
        FIXED=$((FIXED+1))
        echo "  ✓ $f (pfauth war Z${pf_line}, edge-shim Z${es_line} → reordered)"
    else
        ERRORED=$((ERRORED+1))
        echo "  ✗ $f"
    fi
done

echo ""
echo "════════════════════════════════════════════════"
echo " Fixed (reordered):              $FIXED"
echo " Skipped (already pfauth>shim):  $SKIPPED_ALREADY_OK"
echo " Skipped (no edge-shim):         $SKIPPED_NO_EDGE_SHIM"
echo " Skipped (no pfauth):            $SKIPPED_NO_PFAUTH"
echo " Errored:                        $ERRORED"
echo "════════════════════════════════════════════════"

[ "$ERRORED" -gt 0 ] && exit 1
exit 0
