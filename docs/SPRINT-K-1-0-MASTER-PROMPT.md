# PROVA Sprint K-1.0 — Supabase Foundation
## Master-Prompt für Claude Code

**Datum:** 28.04.2026 · **Co-Founder/CTO:** Claude (Master-Plan), Claude Code (Execution)
**Aufwand:** 6-8h, kann in einer Session erledigt werden

---

## 🎯 Mission

PROVA wird von Airtable+Make+Cloudinary-Hybrid auf **Voll-Supabase** migriert. Sprint K-1.0 ist die Foundation: Supabase-Client einrichten, Auth-Migration von Netlify Identity zu Supabase Auth, und Frontend-Lib-Skeleton anlegen. **Das alte System bleibt parallel funktional** bis Sprint K-1.5 Cutover.

---

## 📚 PFLICHT-LEKTÜRE (chronologisch)

Bevor irgendwas geschrieben wird, lese:

1. `/CLAUDE.md` — Regeln (besonders Regel 27 sw.js Bump)
2. `/PROVA-VISION-MASTER.md` — Was bauen wir
3. `/PROVA-ARCHITEKTUR-MASTER.md` — Tech-Stack (alt)
4. `/PROVA-REGELN-PERMANENT.md` — Anti-Patterns
5. `/PROVA-CHAT-TRANSPORT-v34.md` — Letzter Stand vor Refactor

**NEU — Supabase-Schema-Files (alle bereits in Supabase live):**
6. `/supabase-migrations/01_schema_foundation.sql`
7. `/supabase-migrations/02_schema_kerngeschaeft.sql`
8. `/supabase-migrations/03_schema_artefakte_storage.sql`
9. `/supabase-migrations/04_schema_komplett_finale.sql`
10. `/supabase-migrations/05_v2_patch_billing_master_uebersicht_FIXED.sql`
11. `/supabase-migrations/06_v3_patch_final_lueckenschluss.sql`

**Diese Files müssen ins Repo kopiert werden** (aus den Outputs des Master-Chats). Anlegen unter `/supabase-migrations/`.

---

## 🌐 KONTEXT

### Stand jetzt
- Supabase-Schema komplett (61 Tabellen, 24 Functions, 12 Cockpit-Views, pgvector aktiv)
- Marcel als erster User registriert mit `is_founder = TRUE`
- Solo-Workspace mit 14-Tage-Trial
- Project: `cngteblrbpwsyypexjrv`
- Region: Frankfurt (EU)
- Plan: Free (Pro-Upgrade vor Pilot)

### Was im aktuellen Code läuft (alt, nicht antasten!)
- `airtable.js` Proxy-Function (Netlify) → Airtable Base `appJ7bLlAHZoxENWE`
- `auth-guard.js` → Netlify Identity / JWT
- `login.html` → Netlify Identity Widget
- 15+ Netlify Functions
- Make.com Lifecycle (10 Scenarios)

### Was Sprint K-1.0 baut
1. **Supabase-Client** als JS-Modul
2. **Auth-Layer** auf Supabase Auth (Login, Logout, Password-Reset, Session-Handling)
3. **Frontend-Lib-Skeleton:** `data-store.js`, `supabase-client.js`, `template-registry.js`
4. **Pre-Flight für Sprint K-1.1** (Migration vorbereiten)

### Was Sprint K-1.0 NICHT macht
- ❌ Daten migrieren (kommt in K-1.1)
- ❌ Bestehende Pages umbauen (kommt in K-1.3+)
- ❌ Backend-Functions refactoren (kommt in K-1.2)
- ❌ Make.com abschalten (kommt in K-1.5 Cutover)

---

## 🚧 SCOPE-DISZIPLIN

### IST scope:
- Neue Files: `lib/supabase-client.js`, `lib/data-store.js`, `lib/template-registry.js`
- Neue Files: `auth-supabase.html`, `auth-supabase-logic.js` (PARALLEL zur alten login.html)
- ENV-Vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Netlify setzen
- Schema-Files ins Repo kopieren (Versionierung)
- npm-Dependency: `@supabase/supabase-js` v2.x

### IST NICHT scope:
- Bestehende `airtable.js` Function nicht antasten
- Bestehende `login.html` nicht antasten — neue `auth-supabase.html` als Schwester-Page
- Bestehende Pages nicht antasten
- Make.com Scenarios nicht antasten
- Cloudinary nicht antasten

---

## 📦 SPRINT-BLÖCKE

### Block 1 — Repo-Setup + Schema-Versionierung (30 Min)

**Pre-Flight:**
- Git-Status: clean? falls nicht: erst pushen oder stashen
- Branch: `git checkout -b sprint-k-1-0-supabase-foundation`

**Aktionen:**
1. Ordner anlegen: `/supabase-migrations/`
2. Schema-Files reinkopieren (aus Master-Chat-Outputs):
   - `01_schema_foundation.sql`
   - `02_schema_kerngeschaeft.sql`
   - `03_schema_artefakte_storage.sql`
   - `04_schema_komplett_finale.sql`
   - `05_v2_patch_billing_master_uebersicht_FIXED.sql`
   - `06_v3_patch_final_lueckenschluss.sql`
3. README.md im Ordner: kurze Doku welches File was macht
4. Commit: `"K-1.0.1: Supabase-Schema-Files versioniert (61 Tabellen)"`

**Akzeptanz:**
- ✅ Alle 6 SQL-Files im Repo unter `/supabase-migrations/`
- ✅ README.md erklärt Reihenfolge
- ✅ Commit gepusht

---

### Block 2 — npm-Dependency + ENV-Setup (30 Min)

**Pre-Flight:**
- `package.json` checken: existiert? (Netlify-Functions-Setup)
- Falls nicht: `npm init -y` im Repo-Root

**Aktionen:**
1. `npm install @supabase/supabase-js@^2.45.0`
2. `package.json` und `package-lock.json` committen
3. Netlify-ENV-Vars setzen via Dashboard ODER `netlify env:set`:
   - `SUPABASE_URL` = `https://cngteblrbpwsyypexjrv.supabase.co`
   - `SUPABASE_ANON_KEY` = (aus Project Settings → API → "anon public")
   - `SUPABASE_SERVICE_ROLE_KEY` = (aus Project Settings → API → "service_role" — SECRET!)
4. `netlify.toml` updaten falls Build-Settings nötig

**Akzeptanz:**
- ✅ `@supabase/supabase-js` in package.json
- ✅ ENV-Vars in Netlify gesetzt (Marcel verifiziert via Dashboard)
- ✅ Commit: `"K-1.0.2: Supabase npm-package + ENV-Vars"`

---

### Block 3 — `lib/supabase-client.js` Singleton (45 Min)

**Pre-Flight:**
- Ordner `/lib/` anlegen falls nicht da
- Konflikt-Check: existiert schon `supabase-client.js`? (sollte nicht)

**Inhalt von `lib/supabase-client.js`:**

```javascript
// PROVA Supabase Client — Singleton
// Wird von allen anderen Lib-Modulen genutzt
// 
// Browser-Side: nutzt Anon Key (public, RLS schützt)
// Server-Side (Netlify Functions): kann Service Role Key nutzen für Admin-Operationen

import { createClient } from '@supabase/supabase-js';

// Browser-Konfiguration via window.PROVA_CONFIG (in HTML-Pages gesetzt)
const SUPABASE_URL = window.PROVA_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('PROVA: Supabase-Konfiguration fehlt (window.PROVA_CONFIG)');
}

// Singleton-Pattern
let _client = null;

export function getSupabase() {
    if (!_client) {
        _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'prova-auth-token'
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'X-Client-Info': 'prova-web/1.0'
                }
            }
        });
    }
    return _client;
}

// Convenience-Exports
export const supabase = getSupabase();

// Auth-Helpers
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('PROVA Auth Error:', error);
        return null;
    }
    return user;
}

export async function getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return null;
    return session;
}

// Workspace-Context-Helper
let _activeWorkspaceId = null;

export async function getActiveWorkspaceId() {
    if (_activeWorkspaceId) return _activeWorkspaceId;
    
    const user = await getCurrentUser();
    if (!user) return null;
    
    const { data, error } = await supabase
        .from('workspace_memberships')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();
    
    if (error || !data) return null;
    _activeWorkspaceId = data.workspace_id;
    return _activeWorkspaceId;
}

export function setActiveWorkspaceId(id) {
    _activeWorkspaceId = id;
    localStorage.setItem('prova-active-workspace', id);
}

export function clearActiveWorkspace() {
    _activeWorkspaceId = null;
    localStorage.removeItem('prova-active-workspace');
}

// Sign-Out-Helper
export async function signOut() {
    clearActiveWorkspace();
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('PROVA Sign-Out Error:', error);
    }
    window.location.href = '/login.html';
}
```

**Akzeptanz:**
- ✅ `node --check lib/supabase-client.js` grün
- ✅ ESM-Syntax korrekt (export/import)
- ✅ Commit: `"K-1.0.3: Supabase-Client Singleton"`

---

### Block 4 — `lib/data-store.js` Skeleton (60 Min)

**Pre-Flight:**
- Was sind die Hauptobjekte? auftraege, kontakte, dokumente, fotos, eintraege, termine, etc.
- Lese 02_schema_kerngeschaeft.sql für Spalten-Namen

**Inhalt von `lib/data-store.js`:**

```javascript
// PROVA Data-Store — Zentrale Schnittstelle für alle DB-Operationen
//
// Pattern: data-store ersetzt direkten airtable.js-Aufruf
// Beispiel alt:  airtableProxy({ table: 'SCHADENSFAELLE', payload: {...} })
// Beispiel neu:  dataStore.auftraege.create({...})
//
// Vorteile:
// - Multi-Tenancy automatisch (workspace_id wird gesetzt)
// - Real-Time-Subscriptions verfügbar
// - Type-Safety durch klare API
// - RLS schützt unten — wir können entspannt sein

import { supabase, getActiveWorkspaceId, getCurrentUser } from './supabase-client.js';

// ═════════════════════════════════════════════════════════
// AUFTRÄGE
// ═════════════════════════════════════════════════════════

export const auftraege = {
    async list({ typ = null, status = null, limit = 50 } = {}) {
        const wsId = await getActiveWorkspaceId();
        if (!wsId) return { data: [], error: 'Kein Workspace' };
        
        let q = supabase
            .from('auftraege')
            .select('*')
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (typ) q = q.eq('typ', typ);
        if (status) q = q.eq('status', status);
        
        return await q;
    },
    
    async getById(id) {
        const wsId = await getActiveWorkspaceId();
        return await supabase
            .from('auftraege')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', wsId)
            .single();
    },
    
    async getByAz(az) {
        const wsId = await getActiveWorkspaceId();
        return await supabase
            .from('auftraege')
            .select('*')
            .eq('az', az)
            .eq('workspace_id', wsId)
            .single();
    },
    
    async create(data) {
        const wsId = await getActiveWorkspaceId();
        const user = await getCurrentUser();
        return await supabase
            .from('auftraege')
            .insert({
                ...data,
                workspace_id: wsId,
                created_by_user_id: user.id
            })
            .select()
            .single();
    },
    
    async update(id, data) {
        return await supabase
            .from('auftraege')
            .update(data)
            .eq('id', id)
            .select()
            .single();
    },
    
    async softDelete(id) {
        return await supabase
            .from('auftraege')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
    },
    
    // Real-Time-Subscription (für Cross-Device-Vision!)
    subscribeToChanges(callback) {
        const channel = supabase
            .channel('auftraege-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'auftraege' },
                callback)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }
};

// ═════════════════════════════════════════════════════════
// KONTAKTE
// ═════════════════════════════════════════════════════════

export const kontakte = {
    async list({ search = null, limit = 100 } = {}) {
        const wsId = await getActiveWorkspaceId();
        if (!wsId) return { data: [], error: 'Kein Workspace' };
        
        let q = supabase
            .from('kontakte')
            .select('*')
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .order('name', { ascending: true })
            .limit(limit);
        
        if (search) {
            q = q.textSearch('search_vector', search, { type: 'websearch', config: 'german' });
        }
        
        return await q;
    },
    
    async create(data) {
        const wsId = await getActiveWorkspaceId();
        const user = await getCurrentUser();
        return await supabase
            .from('kontakte')
            .insert({
                ...data,
                workspace_id: wsId,
                created_by_user_id: user.id
            })
            .select()
            .single();
    }
    // ... weitere Methoden später
};

// ═════════════════════════════════════════════════════════
// DOKUMENTE / RECHNUNGEN / BRIEFE / GUTACHTEN
// ═════════════════════════════════════════════════════════

export const dokumente = {
    async listForAuftrag(auftragId) {
        const wsId = await getActiveWorkspaceId();
        return await supabase
            .from('dokumente')
            .select('*')
            .eq('auftrag_id', auftragId)
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });
    },
    
    async listInvoices({ status = null } = {}) {
        const wsId = await getActiveWorkspaceId();
        let q = supabase
            .from('dokumente')
            .select('*')
            .eq('workspace_id', wsId)
            .eq('typ', 'rechnung')
            .is('deleted_at', null);
        if (status) q = q.eq('status', status);
        return await q;
    }
    // ... weitere Methoden später
};

// ═════════════════════════════════════════════════════════
// SKELETON für weitere Module
// ═════════════════════════════════════════════════════════

export const fotos = { /* TODO */ };
export const termine = { /* TODO */ };
export const notizen = { /* TODO */ };
export const eintraege = { /* TODO */ };
export const normen = { /* TODO */ };
export const textbausteine = { /* TODO */ };

// ═════════════════════════════════════════════════════════
// AUDIT-LOGGING
// ═════════════════════════════════════════════════════════

export async function auditLog(action, entityTyp, entityId, payload = {}) {
    const wsId = await getActiveWorkspaceId();
    const user = await getCurrentUser();
    return await supabase
        .from('audit_trail')
        .insert({
            workspace_id: wsId,
            user_id: user?.id,
            action,
            entity_typ: entityTyp,
            entity_id: entityId,
            payload
        });
}

// ═════════════════════════════════════════════════════════
// FEATURE-EVENT-TRACKING (für Cockpit-Heatmap)
// ═════════════════════════════════════════════════════════

export async function trackFeatureEvent(typ, featureKey, value = null) {
    const wsId = await getActiveWorkspaceId();
    return await supabase.rpc('log_feature_event', {
        p_workspace_id: wsId,
        p_typ: typ,
        p_feature_key: featureKey,
        p_page_url: window.location.pathname,
        p_value: value
    });
}
```

**Akzeptanz:**
- ✅ `node --check lib/data-store.js` grün
- ✅ Skeleton für 8 Hauptobjekte angelegt
- ✅ Audit-Log + Feature-Event-Tracking eingebaut
- ✅ Real-Time-Subscription-Pattern für `auftraege` exemplarisch
- ✅ Commit: `"K-1.0.4: data-store.js Skeleton mit auftraege+kontakte+dokumente"`

---

### Block 5 — `lib/template-registry.js` (30 Min)

**Pre-Flight:**
- PDFMonkey-Template-IDs aus PROVA-ARCHITEKTUR-MASTER.md übernehmen

**Inhalt von `lib/template-registry.js`:**

```javascript
// PROVA Template-Registry — Single Source of Truth für PDFMonkey-Templates
//
// Bisher: Template-IDs verstreut in 15+ Files
// Neu:    Zentral hier, eine Quelle der Wahrheit
//
// Migration in K-1.4: alle alten Hardcoded-IDs durch Registry-Lookups ersetzen

export const PDFMONKEY_TEMPLATES = {
    // Rechnungen
    'rechnung-jveg':         'S32BEA1F',
    'rechnung-standard':     'B1C3E69D',
    'mahnung-1':             'EA5CAC85',
    'mahnung-2':             'C4BB257B',
    
    // Bestätigungen
    'auftragsbestaetigung':  '64BFD7F0',
    'termin-bestaetigung':   '8ECAC2E4',
    'anschreiben':           'A4E57F73',
    
    // Gutachten
    'schadensgutachten':     '6ADE8D9A',
    'beweissicherung':       'BA076019',
    'ergaenzungsgutachten':  '6FF656D3',
    'gegengutachten':        '6B85ECFF',
    'stellungnahme-intern':  '4233F240',
    'beratung-protokoll':    '8868A0E2',
    'baubegleitung-bericht': '3174576E',
    'baubegleitung-eintrag': '36E140DC',
    'schiedsgutachten':      'A8D05FAB',
    
    // Generisch
    'brief-generisch':       '37CF6A57',
    'bescheinigung-generisch':'4D81616B',
    
    // Wertgutachten
    'wertgutachten':         '29064D98-FD12-4135-9D44-F49CCF9819C6',
    
    // Foto-Doku
    'foto-doku':             '0383BD85',
    'brief-din5008':         'BAD1170B',
    
    // Welcome-Mails
    'welcome-solo':          'EC64C790-3E04',
    'welcome-team':          'E865E0CD-535A',
};

export function getTemplateId(key) {
    const id = PDFMONKEY_TEMPLATES[key];
    if (!id) {
        throw new Error(`PROVA: Unknown PDFMonkey-Template-Key "${key}"`);
    }
    return id;
}

// Future: hier kommt auch die Auswahl-Logik welches Template
// für welchen Auftragstyp das richtige ist
export function getTemplateForAuftragstyp(typ) {
    const mapping = {
        'schaden':              'schadensgutachten',
        'beweis':               'beweissicherung',
        'ergaenzung':           'ergaenzungsgutachten',
        'gegen':                'gegengutachten',
        'wertgutachten':        'wertgutachten',
        'beratung':             'beratung-protokoll',
        'baubegleitung':        'baubegleitung-bericht',
        'schied':               'schiedsgutachten',
    };
    const key = mapping[typ];
    if (!key) throw new Error(`Kein Template für Auftragstyp "${typ}"`);
    return getTemplateId(key);
}
```

**Akzeptanz:**
- ✅ Template-IDs aus Architektur-Doc 1:1 übernommen
- ✅ Commit: `"K-1.0.5: template-registry.js Single-Source-of-Truth"`

---

### Block 6 — Auth-Migration: `auth-supabase.html` parallel zu `login.html` (90 Min)

**WICHTIG:** Bestehende `login.html` mit Netlify Identity bleibt **unangetastet**. Wir bauen eine PARALLELE Login-Page mit Supabase Auth. Erst in K-1.5 wird umgeschaltet.

**Datei: `auth-supabase.html`** (neu)

Komplette Login-Page mit:
- Email + Passwort-Login
- Passwort-Reset-Flow
- Sign-Up-Flow (NEU: User können sich selbst registrieren)
- Auto-Redirect nach Login zu `/cockpit.html?source=supabase`

**Datei: `auth-supabase-logic.js`** (neu)

```javascript
// PROVA Supabase-Auth-Logic — parallele Auth-Page
// 
// Wird in K-1.5 als finales auth-system aktiviert.
// Bis dahin: Test-Mode für Entwickler.

import { supabase, signOut } from './lib/supabase-client.js';

// ─── LOGIN ─────────────────────────────────────────
async function handleLogin(email, password) {
    showLoading();
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    hideLoading();
    
    if (error) {
        showError(getErrorMessage(error));
        return;
    }
    
    showSuccess('Willkommen zurück!');
    
    // Pending Einwilligungen prüfen
    const { data: pending } = await supabase.rpc('get_pending_einwilligungen');
    if (pending && pending.length > 0) {
        // Marcel-Wunsch: Forced Re-Consent
        window.location.href = '/einwilligung-update.html';
        return;
    }
    
    // Normaler Redirect
    window.location.href = '/cockpit.html?source=supabase&login=success';
}

// ─── SIGN-UP ─────────────────────────────────────────
async function handleSignUp(email, password, name) {
    showLoading();
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/auth-supabase.html?action=verified`
        }
    });
    
    hideLoading();
    
    if (error) {
        showError(getErrorMessage(error));
        return;
    }
    
    showSuccess('Bitte bestätige Deine Email — wir haben Dir einen Link gesendet.');
}

// ─── PASSWORT-RESET ────────────────────────────────
async function handlePasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth-supabase.html?action=reset`
    });
    
    if (error) {
        showError(getErrorMessage(error));
        return;
    }
    
    showSuccess('Reset-Link gesendet — schau in Deine Email.');
}

// ─── ERROR-MAPPING ────────────────────────────────
function getErrorMessage(error) {
    const map = {
        'Invalid login credentials':   'Email oder Passwort falsch',
        'Email not confirmed':          'Bitte bestätige zuerst Deine Email',
        'User already registered':      'Email ist bereits registriert',
        'Password should be at least 6 characters': 'Passwort muss mind. 6 Zeichen lang sein',
    };
    return map[error.message] || error.message;
}

// ─── HELPER UI ────────────────────────────────────
function showLoading() { /* ... */ }
function hideLoading() { /* ... */ }
function showError(msg) { /* ... */ }
function showSuccess(msg) { /* ... */ }

// ─── EVENT-LISTENERS ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // URL-Param-Handling: ?action=verified / ?action=reset
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action === 'verified') {
        showSuccess('Email bestätigt! Du kannst Dich jetzt einloggen.');
    } else if (action === 'reset') {
        // Show password-update-form
    }
    
    // Form-Submits binden
    document.getElementById('login-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        handleLogin(email, password);
    });
    
    document.getElementById('signup-form')?.addEventListener('submit', e => {
        e.preventDefault();
        handleSignUp(e.target.email.value, e.target.password.value, e.target.name.value);
    });
    
    document.getElementById('reset-form')?.addEventListener('submit', e => {
        e.preventDefault();
        handlePasswordReset(e.target.email.value);
    });
});
```

**Akzeptanz:**
- ✅ `auth-supabase.html` lädt im Browser
- ✅ Login mit Marcel-Account funktioniert
- ✅ Sign-Up Flow funktioniert (Test-User anlegen + verifizieren)
- ✅ Passwort-Reset funktioniert (Email kommt an)
- ✅ Bestehende `login.html` mit Netlify Identity weiter funktional
- ✅ Commit: `"K-1.0.6: Supabase-Auth parallel zu Netlify Identity"`

---

### Block 7 — Schema-Hookup-Test + Pre-Flight für K-1.1 (30 Min)

**Aktionen:**
1. In `auth-supabase.html` Test-Code einbauen:
```javascript
// Nach erfolgreichem Login: Test-Query
const { data: master } = await supabase
    .from('v_cockpit_master_uebersicht')
    .select('*')
    .single();

console.log('PROVA Master-Cockpit:', master);
```

2. Browser-Test: Login → Console öffnen → Master-Cockpit-Daten sehen
3. Verifizieren: workspace_id ist gesetzt, RLS funktioniert

**Akzeptanz:**
- ✅ Marcel kann sich auf `/auth-supabase.html` einloggen
- ✅ Console zeigt Cockpit-Daten (auch wenn alle Werte 0 sind)
- ✅ Logout funktioniert
- ✅ Neue Session: Auto-Login funktioniert (Token persistiert)
- ✅ Commit: `"K-1.0.7: Auth-Roundtrip getestet, ready für K-1.1"`

---

## ⚠️ KRITISCHE REGELN

1. **Nichts Bestehendes brechen** — alte `login.html`, `airtable.js`, `auth-guard.js` bleiben unangetastet
2. **sw.js NICHT bumpen** in K-1.0 — wir sind im Repo-Setup, kein Frontend-Deploy
3. **Service Role Key NIE in Frontend-Code** — nur Server-Side / Netlify Functions
4. **Tag setzt nur Marcel** — kein automatischer Tag in K-1.0
5. **Block-by-Block Commits** — nicht alles am Ende
6. **Pre-Flight pro Block** — was prüfen, bevor Code geschrieben wird

---

## 🚨 KONFLIKT-PROTOKOLL (NACHT-PAUSE.md)

Wenn unklar oder Konflikt:
1. STOPPEN — kein Raten
2. `NACHT-PAUSE-K1-0.md` erstellen mit:
   - Was funktioniert hat
   - Was unklar ist
   - Was Marcel entscheiden muss
3. Letzten sicheren Stand committen + pushen
4. Marcel pingen

---

## 🌳 WORKING-TREE-DISZIPLIN

**NIEMALS antasten ohne Marcel-OK:**
- `CLAUDE.md`
- `masterplan-v2/`
- `CHANGELOG-MASTER.md`
- `AUDIT-LAYOUT-*.md`
- `NACHT-PAUSE*.md`
- `PROVA-CHAT-TRANSPORT-v34.md`
- `docs/archiv-alte-sprints/`
- Bestehende HTML-Pages (außer neue `auth-supabase.html`)
- Bestehende JS-Logik (außer neue Lib-Files)
- Bestehende Netlify Functions

---

## 📝 ERWARTETE COMMITS

```
K-1.0.1: Supabase-Schema-Files versioniert (61 Tabellen)
K-1.0.2: Supabase npm-package + ENV-Vars
K-1.0.3: lib/supabase-client.js Singleton
K-1.0.4: lib/data-store.js Skeleton mit auftraege+kontakte+dokumente
K-1.0.5: lib/template-registry.js Single-Source-of-Truth
K-1.0.6: Supabase-Auth parallel zu Netlify Identity
K-1.0.7: Auth-Roundtrip getestet, ready für K-1.1
```

---

## ✅ AKZEPTANZ-DEFINITION SPRINT K-1.0

Sprint K-1.0 ist GRÜN wenn:

1. ✅ 6 SQL-Schema-Files im Repo unter `/supabase-migrations/`
2. ✅ `@supabase/supabase-js` in `package.json`
3. ✅ ENV-Vars in Netlify gesetzt
4. ✅ `lib/supabase-client.js` mit Singleton + Auth-Helpers
5. ✅ `lib/data-store.js` Skeleton für 8 Hauptobjekte (3 voll implementiert)
6. ✅ `lib/template-registry.js` mit 22+ PDFMonkey-Template-IDs
7. ✅ `auth-supabase.html` + `auth-supabase-logic.js` lauffähig
8. ✅ Marcel kann sich erfolgreich einloggen
9. ✅ Master-Cockpit-View liefert Daten (auch wenn 0)
10. ✅ Bestehendes System (Airtable+Netlify Identity) weiter funktional
11. ✅ Alle Commits gepusht mit Sprint-Code-Format
12. ✅ NACHT-PAUSE.md falls Konflikte aufgetreten sind

KEIN TAG. Marcel testet manuell und entscheidet dann über K-1.1.

---

## 🚀 NÄCHSTER SCHRITT NACH K-1.0 GRÜN

**Sprint K-1.1 — Migrations-Pipeline Airtable → Supabase**

In K-1.1 bauen wir das Migration-Skript das alle ~30 Airtable-Tabellen nach Supabase überträgt. Foundation steht, jetzt kommen die Daten.

---

*Ende Sprint K-1.0 Master-Prompt*
