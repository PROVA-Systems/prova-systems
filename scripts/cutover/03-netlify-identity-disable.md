# Cutover Schritt 03 — Netlify Identity deaktivieren

**Sprint:** K-1.5 · **Owner:** Marcel · **Reihenfolge:** Schritt 3/5

---

## Voraussetzungen

- ✅ `auth-supabase.html` Production-ready (K-1.4.B12)
- ✅ Founder-Account in Supabase Auth funktional (K-1.0 Roundtrip-Test grün)
- ✅ Mindestens 1 erfolgreicher Login über `auth-supabase.html`
- ⚠️ **Optional:** alle Frontend-Pages auf Supabase migriert (Sprint K-1.4 inkrementell — Hybrid-Modus läuft auch ohne)

---

## Schritte

### 1. Netlify-Redirects so dass `app-login.html` zu `auth-supabase.html` zeigt

Datei: `_redirects` (Repo-Root, von Netlify automatisch gelesen)

```
# K-1.5 Cutover: Login-Page-Wechsel
/login              /auth-supabase.html  301
/app-login.html     /auth-supabase.html  301!
/login.html         /auth-supabase.html  301!
```

`!` = force, überschreibt auch wenn die alte Datei existiert.

### 2. Identity-Widget aus app-login.html entfernen (optional, sauberer)

```bash
mv app-login.html app-login.html.bak
```

Oder: kompletten Inhalt durch HTML-Meta-Refresh ersetzen:
```html
<!DOCTYPE html>
<html><head>
<meta http-equiv="refresh" content="0;url=/auth-supabase.html">
</head><body>Weiterleitung zu /auth-supabase.html …</body></html>
```

### 3. Netlify Identity Service disablen

1. https://app.netlify.com/sites/prova-systems
2. **Site Settings** → **Identity**
3. **Disable Identity Service**
4. **NICHT** löschen — bei Bedarf rückgängig machbar
5. ENV-Vars die bleiben können (schaden nicht):
   - `NETLIFY_IDENTITY_*` — kann drin bleiben

### 4. Welcome / Recovery / Invite Mail-Templates archivieren

Falls Netlify-Identity-Mail-Templates angepasst waren:
1. Settings → Identity → Emails → Templates
2. Screenshot der custom templates für Archiv
3. Resend-Templates anlegen (falls Custom-Branding nötig — Sprint K-2)

---

## Rollback

```
Netlify Dashboard → Site Settings → Identity → Enable
_redirects: 4 Zeilen entfernen
mv app-login.html.bak app-login.html
```

Identity-Widget funktioniert sofort wieder. Marcel-Test-Login geht über alten Pfad.

---

## Frontend-Audit nach Disable

```bash
bash scripts/audit-frontend-pages.sh --legacy
```

→ Pages mit `legacy>0 supabase=0` werden mit Disabled-Identity nicht funktionieren.
   **Hybrid-Snippet** einfügen oder Page voll refactoren (Pattern-Guide).

Workaround bis K-1.4-Pages alle migriert: `_redirects` von Hand:
```
# K-1.5 Cutover Hybrid-Brücke: Pages die Login brauchen
/dashboard.html     /auth-supabase.html  302
/akte.html          /auth-supabase.html  302
```

ODER: für jede Legacy-Page das Hybrid-Snippet (siehe K-1-4-PAGE-MIGRATION-GUIDE.md).
