# Supabase ENV-Setup für Netlify

**Sprint:** K-1.0 Block 2
**Owner:** Marcel (setzt selbst im Netlify-Dashboard)
**Stand:** 28.04.2026

---

## Ziel

Drei ENV-Vars in Netlify setzen, damit `lib/supabase-client.js` (Block 3) und alle Frontend-Pages auf Supabase zugreifen können — und damit spätere Edge-Functions / Migrations-Skripte (Block K-1.2 ff.) Service-Role-Operationen ausführen können.

---

## Die 3 ENV-Vars

| Name | Wert | Zweck | Wo nutzbar |
|---|---|---|---|
| `SUPABASE_URL` | `https://cngteblrbpwsyypexjrv.supabase.co` | Projekt-URL (Frankfurt) | Frontend + Server |
| `SUPABASE_ANON_KEY` | `eyJhbG...` (lang, JWT-Format) | Public-Key für Browser-Clients | **Frontend OK** — RLS schützt |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (lang, JWT-Format) | Bypasst RLS — kann alles in der DB | **NUR Server-Side** |

---

## Wo die Werte holen (Supabase-Dashboard)

1. https://supabase.com/dashboard/project/cngteblrbpwsyypexjrv
2. Linke Sidebar → **Project Settings** (Zahnrad-Icon ganz unten)
3. → **API** Sektion
4. Drei Werte kopieren:
   - **Project URL** → in `SUPABASE_URL`
   - **Project API Keys** → **anon public** → in `SUPABASE_ANON_KEY`
   - **Project API Keys** → **service_role** ⚠️ („Reveal" klicken) → in `SUPABASE_SERVICE_ROLE_KEY`

---

## Wo die Werte setzen (Netlify-Dashboard)

1. https://app.netlify.com/sites/prova-systems/configuration/env
2. **Site Settings** → **Environment variables** → **Add a variable**
3. Pro Variable:
   - **Key:** Name aus der Tabelle oben
   - **Values:** Wert einfügen
   - **Scopes:** „Builds" UND „Functions" anhaken (beide!)
   - **Deploy contexts:** „All deploy contexts" (Production + Deploy Previews + Branch Deploys)
4. Save
5. **Wichtig:** Nach dem Setzen einen Re-Deploy triggern (Deploys → Trigger deploy → Clear cache and deploy site), damit Functions die neuen Vars sehen.

---

## Service-Role-Key — kritische Regeln

**Der Service-Role-Key umgeht alle Row-Level-Security-Policies.** Wer ihn hat, kann jede Tabelle in jedem Workspace lesen und ändern. Behandle ihn wie ein Admin-Passwort.

### NIE im Frontend

- ❌ Nicht in HTML-Pages inline injecten
- ❌ Nicht in `lib/*.js` importieren
- ❌ Nicht in `window.PROVA_CONFIG` setzen
- ❌ Nicht in `netlify.toml` öffentlich committen
- ❌ Nicht in Browser-Devtools-Network-Calls als Header senden

### NUR Server-Side OK

- ✅ Netlify Functions (`netlify/functions/*.js`)
- ✅ Supabase Edge Functions (ab Sprint K-1.2)
- ✅ Migrations-Skripte (Sprint K-1.1)
- ✅ Lokale CLI-Tools für Marcel (mit `.env.local`, nicht committen)

### Bei Verdacht auf Leak

1. Supabase-Dashboard → Project Settings → API → **Reset service_role key**
2. Neuen Key in allen ENV-Stores aktualisieren (Netlify + lokale `.env.local` + ggf. CI/CD)
3. Audit: `audit_trail` auf verdächtige Operationen prüfen
4. Bei Bestätigung: DSGVO-Pflicht-Meldung 72h-Frist

---

## Anon-Key — was ist OK

Der Anon-Key ist **public by design**. Supabase-Dokumentation: „This key is safe to use in a browser if you have enabled Row Level Security for your tables and configured policies."

Das ist bei PROVA der Fall — RLS ist auf jeder Tabelle scharf, basierend auf `workspace_id`. Der Anon-Key alleine kann keine Daten lesen ohne gültigen JWT eines authentifizierten Users.

→ Anon-Key darf in `window.PROVA_CONFIG` inline ins HTML, in Git committet werden (z.B. als Default in netlify.toml), in Browser-Devtools sichtbar sein. Das ist keine Sicherheits-Verletzung.

---

## Verifikation (kommt in Block 7)

Nach dem Setzen der ENV-Vars + Block 7-Test:

```javascript
// Browser-Console auf /tools/test-supabase-login.html nach Login:
console.log(window.PROVA_CONFIG.SUPABASE_URL);
// → "https://cngteblrbpwsyypexjrv.supabase.co"

const { data: master } = await supabase
    .from('v_cockpit_master_uebersicht')
    .select('*')
    .single();
console.log(master);
// → Cockpit-Daten (auch wenn Werte 0 sind)
```

Bei Erfolg: Block 7 grün, Sprint K-1.0 abgeschlossen.

---

## Server-Side-Setup (lokal für Migrations-Skripte)

Marcel hat optional `.env.local` im Repo-Root für lokale Skripte:

```bash
# .env.local — bereits in .gitignore, NIE committen
SUPABASE_URL=https://cngteblrbpwsyypexjrv.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Geladen via `dotenv` (bereits in `package.json`). Wird in Sprint K-1.1 für die Migrations-Pipeline genutzt.

---

## Status nach diesem Block

- ✅ `@supabase/supabase-js@^2.105.0` in `package.json` + `package-lock.json`
- ⏳ Marcel setzt 3 ENV-Vars in Netlify (außerhalb dieses Sprints — Marcel-Job)
- ⏭️ Block 3: `lib/supabase-client.js` Singleton liest `window.PROVA_CONFIG`
