# MEGA⁸⁶-HOTFIX — www-Redirects für Index/App-Split-Polish

**Stand:** 2026-05-17 · Branch: `feat/mega86-hotfix-www-redirects`
**Tag-Empfehlung:** `v3710-mega86-hotfix-www-redirects`
**Aufwand:** ~30 Min

---

## Kontext

In MEGA⁸⁶ Block A.2 (Index/App-Split Audit) wurde festgestellt: 21 sekundäre App-Pages haben in `netlify.toml` nur den `prova-systems.de`-Redirect, die `www.prova-systems.de`-Variante fehlt. Marcel-Symptom „nicht sauber getrennt" — wenn User www.prova-systems.de/<page> aufruft → 404 oder Marketing-Page statt Redirect auf app.prova-systems.de.

Im Original-Audit war das als „DEFER MEGA87" markiert. Marcel-Direktive: jetzt fixen.

---

## Implementation

`netlify.toml` v6.1 — 21 fehlende `www.prova-systems.de/<page>`-Blocks ergänzt nach existing Convention (prova-systems.de zuerst, www danach, identische to/status/force).

### Liste der ergänzten www-Variants (21 Pages)

**Flow B/C/D** (4):
1. `/baubegleitung*`
2. `/beratung*`
3. `/wertgutachten*`
4. `/ortstermin*`

**Werkzeuge** (9):
5. `/jveg*`
6. `/normen*`
7. `/textbausteine*`
8. `/positionen*`
9. `/zpo-anzeige*`
10. `/jahresbericht*`
11. `/kostenermittlung*`
12. `/hilfe*`
13. `/statistiken*`

**Sonstige App-Pages** (5):
14. `/portal*`
15. `/benachrichtigungen*`
16. `/import-assistent*`
17. `/smtp-einrichtung*`
18. `/auftrag-neu*`

**Admin** (2):
19. `/admin-dashboard*`
20. `/admin-login*`

**Bibliothek** (1):
21. `/bibliothek*`

### Pattern pro Eintrag

```toml
# prova-systems.de Variante bleibt (war vorher schon da)
[[redirects]]
  from   = "https://prova-systems.de/<page>*"
  to     = "https://app.prova-systems.de/<page>:splat"
  status = 301
  force  = true

# NEU ergänzt: www-Variante mit identischem Target
[[redirects]]
  from   = "https://www.prova-systems.de/<page>*"
  to     = "https://app.prova-systems.de/<page>:splat"
  status = 301
  force  = true
```

---

## Was wir NICHT geändert haben

- Marketing-Pages: `/`, `/pricing`, `/impressum`, `/datenschutz`, `/agb`, `/avv` bleiben auf prova-systems.de
- Auth-Pages: `/login`, `/register` waren bereits korrekt mit www-Variante
- `/status` — Marketing-Domain-Page mit 200-Rewrite zu `/public-status.html`, kein 301-Redirect
- `app.*` und `admin.*` Subdomain-internen Rewrites unangetastet
- Path-Rewrites (Block C) auf app.prova-systems.de unangetastet

---

## Verify-Status

- `from = "https://www.prova-systems.de/..."` Einträge: **41** (vorher: 20)
- `from = "https://prova-systems.de/..."` Einträge: **42**
- Die 1 verbleibende Differenz: `/status` (200-Rewrite, kein 301)
- → **Praktisch 1:1 Coverage** für alle 301-Redirects

---

## Smoke-Test (Marcel)

### Pre-Apply
1. PR mergen auf `main` → Netlify-Deploy abwarten (~2 Min)
2. Browser-Cache leeren (DevTools → Application → Clear site data)

### 10-URL-Test
```bash
for page in baubegleitung beratung wertgutachten ortstermin jveg normen textbausteine positionen zpo-anzeige jahresbericht kostenermittlung hilfe statistiken portal benachrichtigungen import-assistent smtp-einrichtung auftrag-neu admin-dashboard admin-login bibliothek; do
  echo "=== www.prova-systems.de/$page ===";
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -I "https://www.prova-systems.de/$page"
done
```

Erwartung: alle 21 URLs liefern `301 -> https://app.prova-systems.de/<page>...` (für admin-* nach admin.prova-systems.de).

### Quick-Check via Browser
| # | URL | Erwartung | OK? |
|---|---|---|---|
| 1 | `https://www.prova-systems.de/baubegleitung` | 301 → app.prova-systems.de/baubegleitung | ☐ |
| 2 | `https://www.prova-systems.de/normen` | 301 → app.prova-systems.de/normen | ☐ |
| 3 | `https://www.prova-systems.de/jveg` | 301 → app.prova-systems.de/jveg | ☐ |
| 4 | `https://www.prova-systems.de/auftrag-neu` | 301 → app.prova-systems.de/auftrag-neu | ☐ |
| 5 | `https://www.prova-systems.de/admin-dashboard` | 301 → admin.prova-systems.de/dashboard | ☐ |
| 6 | `https://www.prova-systems.de/bibliothek` | 301 → app.prova-systems.de/bibliothek | ☐ |
| 7 | `https://www.prova-systems.de/textbausteine` | 301 → app.prova-systems.de/textbausteine | ☐ |
| 8 | `https://www.prova-systems.de/` | 200 (Marketing) | ☐ |
| 9 | `https://www.prova-systems.de/impressum.html` | 200 (Marketing) | ☐ |
| 10 | DevTools → Application → SW Version | `prova-v3710-mega86-hotfix-www-redirects` | ☐ |

---

## Pilot-Acceptance

✅ Hotfix abgeschlossen wenn:
- 21 www-Varianten in netlify.toml ergänzt
- SW v3710 deployed
- 10-URL-Test grün
- PR auf main gemerged
- Tag `v3710-mega86-hotfix-www-redirects` gesetzt

→ Marcel kann den letzten Polish-Issue als „geschlossen" markieren.
