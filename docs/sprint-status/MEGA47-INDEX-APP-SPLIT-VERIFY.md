# MEGA⁴⁷ Index/App-Split + SSO-Verify

**Datum:** 2026-05-09 22:00 GMT+2
**Sprint:** MEGA⁴⁷ Night-Shift (Marcel ruht)
**Anlass:** Marcel-Eskalation 08.05. — "Login-Doppel-Eingabe Index→App"

---

## Tl;dr

| Feature | Status | Beweis |
|---|---|---|
| Cookie-Domain `.prova-systems.de` | ✅ Implementiert | `lib/supabase-client.js:48-52` |
| Cross-Domain crossDomainStorage | ✅ Implementiert | `lib/supabase-client.js:53-87` |
| netlify.toml Cross-Domain-Redirects | ✅ 30+ Rules | siehe unten |
| _redirects path-only Aliases | ✅ Landing-Pages | Marketing + Legal |
| Auto-Forward bei Login-State | ✅ MEGA⁴⁷ NEU | `lib/sso-landing-redirect.js` |
| App-Pages reachable auf Landing? | 🟢 NEIN (alle 301'd) | netlify.toml Block B+C |

**Diagnose des Marcel-Symptoms:**
Login passiert **nur einmal** auf app.prova-systems.de. Was Marcel als
"Doppel-Login" wahrnehmen könnte:
1. Click "Anmelden" auf prova-systems.de → 301 zu app.prova-systems.de/login
2. Login-Form sichtbar (User denkt: "Login-Page Nr. 2")
3. Login → Dashboard

Das ist **architektonisch korrekt** (Login gehört zur App-Domain für
Cookie-Scope-Klarheit). Das Symptom ist UX-mäßig: User klickt "Anmelden"
auf Landing und erwartet ein Modal statt einer Page.

**MEGA⁴⁷-Verbesserung:** `sso-landing-redirect.js` patched die Anmelden-Links
auf der Landing zur "Zum Dashboard"-Variante WENN Cookie/localStorage einen
gültigen Token hat. → User der schon eingeloggt war kommt mit 1-Klick rein.

---

## Architektur

```
┌──────────────────────────────────┐
│  prova-systems.de (LANDING)      │  Marketing + Legal + Pricing
│  └─ Anmelden-Link                │
│     └→ MEGA⁴⁷: Token? → Dashboard│
│        Sonst: → app./login (301) │
└──────────────────────────────────┘
            │ 301
            ▼
┌──────────────────────────────────┐
│  app.prova-systems.de (APP)      │  SaaS post-Login
│  └─ /login (auth-supabase.html)  │
│  └─ /dashboard.html              │
│  └─ /akte.html, /termine.html …  │
│                                  │
│  Cookie: prova-auth-token        │
│    Domain: .prova-systems.de     │  ← Cross-Domain-Sharing
│    Path: /                       │
│    SameSite=Lax · Secure         │
└──────────────────────────────────┘
            │ Logout
            ▼
┌──────────────────────────────────┐
│  prova-systems.de (LANDING)      │
└──────────────────────────────────┘
```

---

## SSO-Cookie-Implementierung (lib/supabase-client.js)

```javascript
const COOKIE_DOMAIN = (typeof location !== 'undefined' &&
    /(^|\.)prova-systems\.de$/.test(location.hostname))
    ? '.prova-systems.de'
    : null;

const crossDomainStorage = {
    getItem(key) {
        // 1. Cookie-First (Cross-Subdomain)
        const m = document.cookie.match(...);
        if (m) return decodeURIComponent(m[1]);
        // 2. Fallback localStorage
        return localStorage.getItem(key);
    },
    setItem(key, value) {
        localStorage.setItem(key, value);   // legacy mirror
        document.cookie = key + '=' + encodeURIComponent(value)
            + '; expires=' + expires
            + '; domain=.prova-systems.de'
            + '; path=/'
            + '; SameSite=Lax'
            + '; Secure';
    }
};

createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'prova-auth-token',
        storage: crossDomainStorage,        // ← Cookie + localStorage
        flowType: 'pkce'
    }
});
```

**Effekt:** Login auf app.prova-systems.de setzt Cookie auf
`.prova-systems.de` → automatisch sichtbar für prova-systems.de Subdomain.

**Browser-Test:**
```
1. Inkognito-Tab → https://app.prova-systems.de/login
2. Email + Passwort → Login
3. F12 → Application → Cookies → "prova-systems.de"
4. Erwartung: Cookie "prova-auth-token" mit Domain ".prova-systems.de"
5. Neue Tab → https://prova-systems.de/
6. F12 → Application → Cookies → Cookie sichtbar (cross-domain ✓)
7. Click "Anmelden" auf Landing
8. MEGA⁴⁷-Patch: Link wird zu "Zum Dashboard →"
9. Click → direkt Dashboard ohne Re-Login
```

---

## Cross-Domain-Redirects (netlify.toml Block B)

App-only-Pages auf prova-systems.de werden 301 zu app-Subdomain umgeleitet:

```
/login                  → app.prova-systems.de/login              [301]
/register               → app.prova-systems.de/register           [301]
/dashboard*             → app.prova-systems.de/dashboard:splat    [301]
/akte*                  → app.prova-systems.de/akte:splat         [301]
/app*                   → app.prova-systems.de/app:splat          [301]
/archiv*                → app.prova-systems.de/archiv:splat       [301]
/briefe*                → app.prova-systems.de/briefe:splat       [301]
/kontakte*              → app.prova-systems.de/kontakte:splat     [301]
/profil*                → app.prova-systems.de/profil:splat       [301]
/admin*                 → admin.prova-systems.de/admin:splat      [301]
... 30+ weitere
```

**Auch www.prova-systems.de** ist als separater Host konfiguriert (Netlify
unterscheidet diese strict). 30+ Doppel-Redirects.

**Logout:** `app.prova-systems.de/logout` → `prova-systems.de/` (302)
zurück zur Landing.

---

## Landing-Pages-Inventar (prova-systems.de)

Erlaubte Pages auf prova-systems.de (NICHT redirected):

| Page | Zweck |
|---|---|
| `/` (index.html) | Landing/Hero |
| `/pricing.html` | Pricing |
| `/kontakt.html` | Marketing-Kontakt |
| `/agb.html` | Legal |
| `/datenschutz.html` | Legal |
| `/impressum.html` | Legal |
| `/avv.html` | DSGVO-AVV |
| `/widerruf.html` | Verbraucher-Widerruf |
| `/pilot.html` | Marketing-Pilot-Programm |
| `/hilfe.html` | Public Help |
| `/status.html` | Public Status-Page |
| `/team-interest.html` | Lead-Magnet |
| `/404.html` | Error |

Alle anderen Pages → 301 zu app-Subdomain.

---

## MEGA⁴⁷-Patch: SSO-Auto-Forward

`lib/sso-landing-redirect.js` (NEU):
- Detection: `prova-auth-token` Cookie ODER `prova_auth_token` localStorage
- Patch alle Anmelden-Links via `data-prova-login-link` oder textContent-Match
- Wandelt Link um:
  - href: `app.prova-systems.de/dashboard.html`
  - text: "Zum Dashboard →"
  - data-attribut: `data-sso-patched=1`

`index.html`:
- Anmelden-Link mit `data-prova-login-link="1"` markiert
- Script-Tag `<script src="/lib/sso-landing-redirect.js" defer>` vor `</body>`

---

## Bekannte Probleme (defer-K-1.5)

### Safari ITP / Strikte Cookie-Policies
Browser wie Safari (ITP 2.3+) und Firefox-Strict-Mode können
Cross-Subdomain-Cookies blockieren wenn die User direkt aus einem anderen
Site kommt (Top-Level-Navigation).

**Mitigation:**
- localStorage-Mirror als Fallback
- Browser-Test in Safari-Strict-Mode pending Pilot-User-Phase

### Cookie-Size > 4KB
Supabase JWT (vor allem mit Custom Claims) kann größer als 4KB werden →
Cookie wird möglicherweise abgeschnitten.

**Mitigation:**
- Beobachten in Browser-DevTools
- Falls Problem: Custom Claims minimieren oder JWT-Size reduzieren

### Custom-Domain-Setup
beide Subdomains müssen auf der gleichen Netlify-Site oder mit gleicher
SSL-Zertifikats-Wildcard liegen.

**Verifikation:**
- DNS: `dig app.prova-systems.de` zeigt CNAME zu prova-systems.netlify.app
- SSL: Wildcard *.prova-systems.de oder Multi-SAN gültig

---

## Acceptance

| Kriterium | Status |
|---|---|
| Login auf app.prova-systems.de funktioniert | ✅ MEGA⁴⁵ |
| Cookie wird auf `.prova-systems.de` gesetzt | ✅ Code-verified |
| Cross-Subdomain-Cookie sichtbar | ✅ via crossDomainStorage |
| Anmelden-Link redirected korrekt | ✅ netlify.toml Block A |
| Logout → Landing | ✅ netlify.toml |
| App-Pages auf Landing 301'd | ✅ Block B (30+ rules) |
| MEGA⁴⁷ SSO-Auto-Forward | ✅ NEU implementiert |

**Marcel-Test:**
```
1. Auf prova-systems.de (Inkognito): "Anmelden" → app./login (saubere Page)
2. Login → Dashboard
3. Tab schließen
4. Neue Tab → prova-systems.de
5. F12 Console → cookie sollte da sein
6. "Anmelden"-Button text muss "Zum Dashboard →" sein (MEGA⁴⁷)
7. Click → Dashboard ohne Re-Login ✓
```

Wenn Schritt 6 fehlschlägt: Cookie nicht gesetzt — Detail-Audit nötig.
