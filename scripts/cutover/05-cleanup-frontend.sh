#!/bin/bash
# ============================================================
# PROVA Cutover Schritt 05 — Frontend-Cleanup
# Sprint K-1.5 · NACH grünem Cutover ausführen!
#
# Löscht:
#   - airtable.js + zugehörige Helper
#   - prova-pseudo-send.js (Pseudonymisierung jetzt server-side in ki-proxy)
#   - prova-fetch-auth.js, prova-auth-api.js, prova-sv-airtable.js
#   - alte auth-guard.js (durch lib/auth-guard.js ersetzt)
#   - Netlify Functions die durch Edge Functions ersetzt sind
#   - .bak-Files älter als 30 Tage
#
# Usage:
#   bash scripts/cutover/05-cleanup-frontend.sh --dry-run    # zeigt was gelöscht würde
#   bash scripts/cutover/05-cleanup-frontend.sh              # interaktiv mit Confirmation
#   bash scripts/cutover/05-cleanup-frontend.sh --force      # ohne Rückfrage (CI)
# ============================================================

set -e
cd "$(dirname "$0")/../.."

DRY_RUN=0
FORCE=0
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=1 ;;
        --force)   FORCE=1 ;;
    esac
done

OBSOLETE_FRONTEND=(
    "airtable.js"
    "prova-pseudo-send.js"
    "prova-fetch-auth.js"
    "prova-auth-api.js"
    "prova-sv-airtable.js"
    "auth-guard.js"           # alter Netlify-Identity-Guard
)

OBSOLETE_NETLIFY_FUNCTIONS=(
    "netlify/functions/ki-proxy.js"
    "netlify/functions/whisper-diktat.js"
    "netlify/functions/pdf-proxy.js"
    "netlify/functions/airtable.js"
    "netlify/functions/prova-audit.js"
    "netlify/functions/auth-token-issue.js"
    "netlify/functions/stripe-webhook.js"
)

echo "PROVA Cutover Cleanup-Tool"
echo "$([ "$DRY_RUN" = "1" ] && echo '(DRY-RUN — keine Löschung)' || echo '(LIVE)')"
echo

found=()
for f in "${OBSOLETE_FRONTEND[@]}" "${OBSOLETE_NETLIFY_FUNCTIONS[@]}"; do
    if [ -f "$f" ]; then
        found+=("$f")
        echo "  → $f $(stat -c %s "$f" 2>/dev/null || stat -f %z "$f" 2>/dev/null) bytes"
    fi
done

if [ ${#found[@]} -eq 0 ]; then
    echo "Keine obsoleten Files gefunden — Cleanup bereits durchgeführt?"
    exit 0
fi

echo
echo "Total: ${#found[@]} Files"

if [ "$DRY_RUN" = "1" ]; then
    echo "(dry-run) — keine Löschung"
    exit 0
fi

if [ "$FORCE" != "1" ]; then
    read -p "Wirklich löschen? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Abgebrochen."
        exit 0
    fi
fi

# 1. Obsolete Files in obsolete/ verschieben (Soft-Delete für Recovery)
mkdir -p _obsolete-cutover-$(date +%Y%m%d)
for f in "${found[@]}"; do
    target="_obsolete-cutover-$(date +%Y%m%d)/$(basename "$f")"
    mv "$f" "$target"
    echo "  moved $f → $target"
done

# 2. Alte .bak-Files (älter 30 Tage)
old_baks=$(find . -name "*.bak" -type f -mtime +30 2>/dev/null | head -20)
if [ -n "$old_baks" ]; then
    echo
    echo "Alte .bak-Files (>30 Tage):"
    echo "$old_baks"
    if [ "$FORCE" = "1" ] || { read -p "Auch löschen? [y/N] " -n 1 -r; echo; [[ $REPLY =~ ^[Yy]$ ]]; }; then
        echo "$old_baks" | xargs rm -v
    fi
fi

echo
echo "✓ Cleanup done."
echo "  Recovery: _obsolete-cutover-$(date +%Y%m%d)/"
echo "  Tag-Empfehlung: git tag v180-k-1-cutover-done && git push --tags"
