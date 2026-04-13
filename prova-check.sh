#!/bin/bash
# ═══════════════════════════════════════════════════════
# PROVA Pre-Deploy Quality Gate v1.0
# Läuft vor jedem Deploy. Blockiert bei Fehlern.
# Einbinden: package.json → "predeploy": "bash prova-check.sh"
#            netlify.toml → command = "bash prova-check.sh"
#            git hook:    .git/hooks/pre-push
# ═══════════════════════════════════════════════════════

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ERRORS=0
WARNINGS=0

pass() { echo -e "  ${GREEN}✅ $1${NC}"; }
fail() { echo -e "  ${RED}❌ $1${NC}"; ERRORS=$((ERRORS+1)); }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; WARNINGS=$((WARNINGS+1)); }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PROVA Pre-Deploy Quality Gate               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Syntax-Check: Alle JS-Dateien ──────────────────────────────
echo -e "${BLUE}▸ Syntax-Check...${NC}"
SYNTAX_ERR=0
for f in *.js; do
  case "$f" in marked*|build-compat*) continue;; esac
  result=$(node --check "$f" 2>&1)
  if [ -n "$result" ]; then
    msg=$(echo "$result" | grep -o 'SyntaxError[^$]*' | head -c 80)
    echo -e "  ${RED}❌ $f${NC}: $msg"
    SYNTAX_ERR=$((SYNTAX_ERR+1))
    ERRORS=$((ERRORS+1))
  fi
done
for f in netlify/functions/*.js; do
  result=$(node --check "$f" 2>&1)
  if [ -n "$result" ]; then
    msg=$(echo "$result" | grep -o 'SyntaxError[^$]*' | head -c 80)
    echo -e "  ${RED}❌ $f${NC}: $msg"
    SYNTAX_ERR=$((SYNTAX_ERR+1))
    ERRORS=$((ERRORS+1))
  fi
done
if [ $SYNTAX_ERR -eq 0 ]; then
  COUNT=$(ls *.js netlify/functions/*.js 2>/dev/null | wc -l | tr -d ' ')
  pass "$COUNT Dateien — 0 Syntax-Fehler"
fi

# ── 2. Optional Chaining in Frontend-JS ───────────────────────────
echo ""
echo -e "${BLUE}▸ Browser-Kompatibilität (optional chaining)...${NC}"
OC_ERR=0
# Diese Dateien sind Netlify Functions (Node.js) - dürfen optional chaining haben
FUNCS="airtable.js ki-proxy.js mahnung-pdf.js push-notify.js rechnung-pdf.js stripe-webhook.js zugferd-rechnung.js smtp-senden.js smtp-test.js smtp-credentials.js brief-pdf-senden.js emails.js audit-log.js"
for f in *.js; do
  case "$f" in marked*|build-compat*) continue;; esac
  is_func=0
  for func in $FUNCS; do
    if [ "$f" = "$func" ]; then is_func=1; break; fi
  done
  if [ $is_func -eq 1 ]; then continue; fi
  oc=$(python3 -c "import re,sys; c=open('$f').read(); print(len(re.findall(r'\?\.[a-zA-Z\[]',c)))" 2>/dev/null || echo 0)
  nc=$(python3 -c "c=open('$f').read(); print(c.count('??'))" 2>/dev/null || echo 0)
  total=$((oc+nc))
  if [ $total -gt 0 ]; then
    fail "$f: $total Browser-inkompatible Stellen (?.×$oc ??×$nc)"
    OC_ERR=$((OC_ERR+1))
  fi
done
[ $OC_ERR -eq 0 ] && pass "Kein optional chaining in Frontend-JS"

# ── 3. sw.js Version ──────────────────────────────────────────────
echo ""
echo -e "${BLUE}▸ sw.js Cache-Version...${NC}"
SW_VER=$(grep -o "prova-v[0-9]*" sw.js 2>/dev/null | head -1)
[ -n "$SW_VER" ] && pass "$SW_VER" || fail "sw.js Version nicht gefunden"

# ── 4. Kritische Dateien ──────────────────────────────────────────
echo ""
echo -e "${BLUE}▸ Kritische Dateien...${NC}"
for f in nav.js auth-guard.js prova-auth-api.js theme.js prova-design.css mobile.css sw.js netlify.toml netlify/functions/airtable.js netlify/functions/ki-proxy.js netlify/functions/smtp-credentials.js netlify/functions/dsgvo-loeschen.js netlify/functions/lib/cors-helper.js; do
  [ ! -f "$f" ] && fail "FEHLT: $f"
done
pass "Alle kritischen Dateien vorhanden"

# ── 5. CORS Wildcards (nur echte Code-Zeilen, keine Kommentare) ───
echo ""
echo -e "${BLUE}▸ CORS Wildcard Check...${NC}"
CORS_WILD=$(grep -rn "'Access-Control-Allow-Origin': '\*'" netlify/functions/ 2>/dev/null | grep -v "^\s*//" | grep -v "NIEMALS\|comment\|#" | wc -l | tr -d ' ')
if [ "$CORS_WILD" != "0" ]; then
  fail "$CORS_WILD echte CORS Wildcards in Functions"
else
  pass "Kein CORS Wildcard in Produktionscode"
fi

# ── 6. Webhook-URLs im Frontend ───────────────────────────────────
echo ""
echo -e "${BLUE}▸ Webhook-Sicherheit...${NC}"
WH=$(grep -rl "hook\.eu1\.make\.com" *.js 2>/dev/null | grep -v "sw\.js\|stripe-checkout\|emails\." | tr '\n' ' ')
if [ -n "$WH" ]; then
  fail "Webhook-URLs in Frontend: $WH"
else
  pass "Keine Webhook-URLs im Frontend"
fi

# ── 7. Multi-Tenant Sicherheit ────────────────────────────────────
echo ""
echo -e "${BLUE}▸ Multi-Tenant Sicherheit...${NC}"
if grep -q "injectUserEmailFilter" netlify/functions/airtable.js 2>/dev/null; then
  pass "Server-seitiger sv_email Filter aktiv"
else
  fail "injectUserEmailFilter FEHLT in airtable.js!"
fi

# ── 8. SMTP Passwort ──────────────────────────────────────────────
echo ""
echo -e "${BLUE}▸ SMTP Passwort-Sicherheit...${NC}"
SMTP_LS=$(grep -rl "localStorage.*smtp_pass\|smtp_pass.*localStorage" *.js *.html 2>/dev/null | wc -l | tr -d ' ')
if [ "$SMTP_LS" != "0" ]; then
  warn "prova_smtp_pass in $SMTP_LS Dateien (Kommentare/Lesezugriff prüfen)"
else
  pass "Kein Klartext-Passwort im localStorage"
fi

# ── ERGEBNIS ──────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
if [ $ERRORS -gt 0 ]; then
  echo -e "${BLUE}║${NC}  ${RED}❌ DEPLOY BLOCKIERT — $ERRORS Fehler${NC}               ${BLUE}║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${RED}Alle Fehler beheben, dann nochmal ausführen.${NC}"
  exit 1
else
  echo -e "${BLUE}║${NC}  ${GREEN}✅ DEPLOY FREIGEGEBEN — $WARNINGS Warnungen${NC}          ${BLUE}║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  exit 0
fi

# ── 9. Layout-Config: Jede HTML-Seite eingetragen? ────────────────
echo ""
echo -e "${BLUE}▸ Layout-Config Vollständigkeit...${NC}"
UNCONFIGURED=0
python3 - << 'PYEOF'
import os, re, sys

base = '.'
config_file = 'prova-layout.config.js'

if not os.path.exists(config_file):
    print('  \033[0;31m❌ prova-layout.config.js fehlt!\033[0m')
    sys.exit(1)

with open(config_file, 'r') as f:
    config = f.read()

# Alle .html Dateien
html_files = [f for f in os.listdir(base) if f.endswith('.html')]

# Alle in Config genannten Dateien
configured = set(re.findall(r"'([^']+\.html)'", config))

not_configured = []
for hf in sorted(html_files):
    # Encoding-Artefakte ignorieren
    if any(c in hf for c in ['#', '_#', '├', 'U251', 'U00']): continue
    if hf not in configured:
        not_configured.append(hf)

if not_configured:
    for f in not_configured:
        print(f'  \033[0;33m⚠️  Nicht in Layout-Config: {f}\033[0m')
else:
    total = len(html_files)
    print(f'  \033[0;32m✅ Alle {total} HTML-Seiten in Layout-Config eingetragen\033[0m')
PYEOF
