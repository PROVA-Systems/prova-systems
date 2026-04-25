# Notfall-Bookmarklet

**Stand:** 25.04.2026 (S-SICHER P4A.8)
**Zweck:** Marcel-Backup falls der Login-Flow bricht.

---

## Wann brauchst du das?

Wenn du auf `prova-systems.de/app-login.html` einen Login machst, der Browser-Code ausgesperrt aussieht, oder du DevTools-Konsole-Logs nicht siehst weil du gar nicht erst auf eine geschützte Seite kommst — dann setzt du mit dem Bookmarklet einen lang-laufenden HMAC-Token direkt in `localStorage`, und Auth-Guard akzeptiert dich für 90 Tage.

Das ist ein **Notfall-Werkzeug**, nicht der normale Login-Pfad.

---

## Token einmalig erzeugen

Das Skript generiert dir einen neuen 90-Tage-Token. Der Wert wird **nicht ins Repo geschrieben** — du speicherst ihn selbst sicher (1Password / Bitwarden / Passwort-Manager).

**PowerShell:**
```powershell
$env:AUTH_HMAC_SECRET="<wert-aus-netlify>"
node scripts/generate-emergency-token.js
```

**Bash:**
```bash
AUTH_HMAC_SECRET="<wert-aus-netlify>" node scripts/generate-emergency-token.js
```

**Wert aus Netlify holen:**
Site → Site configuration → Environment variables → `AUTH_HMAC_SECRET` → Edit → Value kopieren.

Output-Format:
```
TOKEN:
eyJzdWIiOiJtYXJjZWxfc2NocmVpYmVyOD…
```
Plus zwei alternative Verwendungs-Snippets (Bookmarklet-URL + DevTools-Eintrag).

---

## Bookmarklet einrichten

1. Im Browser einen neuen Bookmark anlegen (z. B. mit Strg+D, dann „Bookmark editieren" wählen).
2. Name: `PROVA Notfall-Login`
3. URL: das `javascript:void(localStorage.setItem('prova_auth_token','…'));…` aus dem Skript-Output.
4. Speichern.

**Bei Notfall:**
- Tab auf `prova-systems.de` öffnen.
- Bookmark klicken.
- Page lädt zu `dashboard.html` mit eingeloggtem Status.

---

## Sicherheits-Hinweise

- **Token NIE in Git committen, NIE per E-Mail versenden, NIE in Slack posten.** Sicher in Passwort-Manager.
- **Token rotieren:** Wenn du den Token verlierst oder ein Verdacht auf Leak besteht: Netlify-Dashboard → `AUTH_HMAC_SECRET` rotieren. **Damit werden ALLE bestehenden Tokens invalidiert** (auch die deiner Pilot-User) — alle müssen sich neu einloggen.
- **TTL:** 90 Tage. Danach Skript erneut ausführen.
- **Marker:** Der Token enthält `emergency: true` im Payload — späteres AUDIT_TRAIL kann das filtern und Notfall-Logins separat sichtbar machen.

---

## Wenn Bookmarklet nicht funktioniert

DevTools auf `https://prova-systems.de/dashboard.html` öffnen (F12), Konsole, eingeben:

```javascript
localStorage.setItem('prova_auth_token','<DEIN_TOKEN>');
location.href = '/dashboard.html';
```

Falls auth-guard.js den Token ablehnt → Token mit `auth-token-verify` testen:
```javascript
fetch('/.netlify/functions/auth-token-verify', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({token: localStorage.getItem('prova_auth_token')})
}).then(r=>r.json()).then(console.log);
```

Erwartet: `{valid:true, payload:{sub:"marcel...", verified:true, emergency:true, ...}}`. Wenn `valid:false` → Token-Secret stimmt nicht überein, Skript erneut mit korrektem `AUTH_HMAC_SECRET` ausführen.
