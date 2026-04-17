# PROVA SESSION 1 — FIXES LIEFERUNG
**Datum:** 17. April 2026
**Durch:** Claude Co-Founder + Marcel
**Umfang:** 9 Fixes, 13 Dateien, 1 neues Script

---

## A. Lieferumfang

| Pfad | Art | Fix-Ref |
|---|---|---|
| `app-starter.html` | geändert | #1 |
| `app-enterprise.html` | geändert | #1 |
| `netlify/functions/make-proxy.js` | geändert | #1 |
| `freigabe-logic.js` | geändert | #2 |
| `onboarding.html` | geändert | #3 |
| `prova-check.sh` | geändert | #4, #8 |
| `prova-design.css` | geändert | #5, #9 |
| `dashboard.html` | geändert | #5 (prova-design.css eingebunden) |
| `freigabe.html` | geändert | #5, #9 |
| `global-search.js` | geändert | #6 |
| `baubegleitung.html` | geändert | #7 |
| `scripts/audit-tote-buttons.py` | **NEU** | #8 |
| `kontakte.html` | geändert | #9 |
| `sw.js` | geändert | Cache v123 → v124 |

Alle Dateinamen und Pfade sind **identisch zu den bestehenden** im Repo. Einfach ersetzen/hinzufügen.

---

## B. Deploy-Schritte

1. Alle 14 Files ins Repo kopieren (Root-Level bzw. Unterordner `netlify/functions/` und `scripts/`).
2. `scripts/audit-tote-buttons.py` als neue Datei committen.
3. **sw.js Cache-Version** ist bereits auf `prova-v124` (vorher v123). `prova-check.sh` würde sie beim Netlify-Build zusätzlich auto-inkrementieren, deshalb landet sie live bei v125. Kein Problem — macht den Browser-Cache sauber invalid.
4. Git push → Netlify Auto-Deploy.

---

## C. Netlify ENV-Actions (pflicht für Fix #1)

In Netlify Dashboard → Site Settings → Environment Variables ergänzen:

```
MAKE_WEBHOOK_S9 = https://hook.eu1.make.com/bslfuqmlud1vo8qems5ccn5z5f2eq4dl
```

Die URL stammt 1:1 aus der bisher hardcoded im Frontend stehenden Variable. `MAKE_WEBHOOK_S1` sollte laut Transport bereits gesetzt sein — wenn nicht, auch setzen:
```
MAKE_WEBHOOK_S1 = https://hook.eu1.make.com/imn2n5xs7j251xicrmdmk17of042pt2t
```

Ohne diese ENVs liefern S1-/S9-Aufrufe HTTP 200 mit `{ skipped: true, reason: 'Webhook nicht konfiguriert' }` zurück — sie brechen also nicht, sind aber inaktiv.

---

## D. Was jeder Fix bewirkt — Kurzfassung

**Fix #1 — Webhook-URLs im Frontend (P0)**
Sicherheitsleck in `app-starter.html` und `app-enterprise.html`: Zwei Make-Webhook-URLs waren hartcodiert sichtbar für jeden eingeloggten SV. Jetzt über `/.netlify/functions/make-proxy?key=s1` bzw. `...?key=s9`. Der Proxy akzeptiert jetzt auch `s9` als Key.

**Fix #2 — freigabe-logic.js SV-Profil-Loader (P0)**
Die Funktion `ladeSVProfil()` suchte mit `{SV_Email}="..."` in SACHVERSTAENDIGE, aber das Feld heißt dort `Email`. Und `recFields.SV_Email` auf Fall-Records war falsch — richtig ist `sv_email` (klein). Folge: SV-Profil war leer → KI-Offenlegung, MwSt, Signatur im Freigabe-PDF unbefüllt. Beide Lookups korrigiert.

**Fix #3 — onboarding.html Preise (P1)**
Alte Paketstruktur "Starter 179 € + 499 € Setup / Pro 369 € + 1.499 € Setup / Enterprise" komplett raus. Neu: Kanonisch "Solo 149 € / Team 279 €", keine Setup-Fees, Enterprise-Card entfernt (Marcel-Regel: nur Solo + Team). CSS-Klassen, IDs, onclick-Handler, JS-Objekte, Default-Auswahl alles konsistent umgestellt.

**Fix #4 — prova-check.sh Webhook-Scan auf HTML (P1)**
Bisher prüfte der Scan nur `*.js` — so sind die Webhooks in app-starter.html 98+ Commits lang durchgerutscht. Neu: `--include="*.js" --include="*.html"` + saubere Ausschlussliste. Regressions-Test: künstliche Test-URL → blockt korrekt.

**Fix #5 — prova-design.css als zentraler Token-Standard (P1)**
Farb-Tokens (`--bg`, `--surface`, `--text`, etc.) werden jetzt einmal in prova-design.css definiert statt pro Seite inline. Werte identisch zu dashboard.html (Marcel's Referenz, nicht schwarz-schwarz). Neue Elevation-Tokens (`--bg-elev`, `--surface3`), WCAG-Kontrast-Dokumentation als Kommentar, kein `!important`-Overuse. `prova-design.css` jetzt auch in dashboard.html + freigabe.html eingebunden (fehlte dort!).

**Fix #6 — global-search.js mit Progressive Prefix + 6 Quellen (P1)**
Kern-Feature, das Marcel wollte:
- Eingabe `4` → alle mit 4, `41` → nur 41er, `4109` → nur 4109 (kein 1684109 mehr)
- Formel: `LEFT({Aktenzeichen},${q.length})="${q}"` bei Ziffern, sonst `FIND(...)`
- 4 Airtable-Quellen parallel: SCHADENSFAELLE (inkl. Gericht_AZ), RECHNUNGEN, KONTAKTE, BRIEFE — alle mit echten Table-IDs und `sv_email`-Pflichtfilter
- 2 lokale Quellen: Textbausteine (localStorage), Positionen (JS-Array)
- Debounce 400ms + Staleness-Guard, `Promise.all` für parallele Fetches

**Fix #7 — baubegleitung.html Dark-Theme + Button-Duplikat (P2)**
Die Seite hatte inline `background:#fff` auf Karten (dein "2005-Look"-Beispiel). Jetzt alle Card-/Section-Styles auf Tokens (`var(--surface)`, `var(--bg3)`). `topbar-right padding-right:160px` → `0` (vergessener Debug-Wert). Button "＋ Neues Projekt" bleibt, Modal-Titel jetzt "Baubegleitungsprojekt anlegen" → kein doppelter Text mehr. `prova-design.css` eingebunden.

**Fix #8 — Tote-Buttons-Audit-Tool (P2)**
Neues Script `scripts/audit-tote-buttons.py`. Scannt alle HTMLs, cross-checked gegen 1.395 im JS referenzierte IDs/Klassen. Heuristik berücksichtigt `onclick`, `type="submit"`, `href`, `data-*`, Parent-`onclick` (Bubble-Pattern), JS-Bindings. Integriert in `prova-check.sh` als **Warnung** (nicht Blocker).

Aktueller Stand: **19 potentielle Treffer**, davon realistisch eigentliche Bugs nur 1 (Notification-Bell in dashboard.html 🔔), der Rest ist Demo-Content (app-enterprise.html Icon-Buttons) oder false-positive durch Wrapper-onclick (app-pro.html "Fälle kaufen"). Für deinen manuellen Review.

**Fix #9 — `--content-pad` gleichmäßige Sidebar-Abstände (P2)**
Content-Container (`.main`, `.main-wrap`, `.doku-wrap` etc.) hatten pro Seite unterschiedliche Paddings (24/20/80, 24/28/48, 12/12/72). Neu: Zwei Tokens `--content-pad-x/y` in prova-design.css, plus zentrale Default-Regel. Drift in `freigabe.html` und `kontakte.html` direkt auf Tokens umgestellt. Zukünftige Seiten sind automatisch konsistent.

---

## E. Build-Gate-Status

Alle Checks grün, 1 Informations-Warnung (Tote-Buttons-Audit, nicht Blocker):

```
✅ Syntax-Check (156 Dateien)
✅ Browser-Kompatibilität (kein optional chaining in Frontend)
✅ sw.js Cache-Version auto-Increment
✅ Kritische Dateien vorhanden
✅ Kein CORS Wildcard
✅ Keine Webhook-URLs im Frontend (JS + HTML geprüft)
✅ Multi-Tenant-Filter aktiv
✅ Kein Klartext-SMTP-Passwort
⚠️  19 potentiell tote Buttons (informativ, kein Blocker)
```

---

## F. Offene Punkte für Session 2

1. **E2E-Test Core-Workflow** — noch nie vollständig getestet: Diktat → G1 → KI-Entwurf → Freigabe → PDF → E-Mail → Rechnung → Zahlung.
2. **Make T3** (Gmail-Connection auswählen) und **F1** (aktivieren) — UI-Klicks.
3. **`STRIPE_WEBHOOK_SECRET`** nach Stripe-Registrierung aktualisieren.
4. **Notification-Bell in dashboard.html 🔔** — der einzige echte tote Button aus dem Audit.
5. **Weitere Seiten mit Page-spezifischen `:root`-Blöcken** — langfristig auf zentrale Tokens umstellen (Migration in kleinen Schritten).
6. **Enterprise-Paket in anderen Legacy-Stellen** — falls noch irgendwo referenziert (einstellungen, admin), auf Solo/Team umstellen.
7. **SV_Email vs sv_email Feldnamen-Audit** in weiteren Dateien (push-notify, dsgvo-loeschen, frist-guard, archiv-logic) — kleine Probe-Calls gegen Airtable machen, um die echten Feldnamen je Log-Tabelle zu bestätigen.

---

## G. Was nicht getan wurde (bewusst)

- **Keine Massen-HTML-Patches** (NinjaAI-Ansatz). Nur gezielte Änderungen in Files, die wirklich betroffen sind.
- **Kein !important-Overuse.** Saubere Kaskade wo möglich.
- **Keine neuen Dateinamen.** Alle Pfade identisch mit Repo.
- **Keine Topbar-Einführung.** Sidebar-Layout unverändert.
- **Kein Rewrite von global-search.js.** Erweitert, nicht neugeschrieben.

---

*Erstellt: 17. April 2026 · PROVA Session 1 · Marcel + Claude*
