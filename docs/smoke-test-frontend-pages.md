# Marcel-Aktion: Frontend-Smoke-Test (MEGA⁴⁴ Pre-Pilot)

**Stand:** 2026-05-09 03:30 GMT+2
**Aufwand:** ~30 Min im Browser
**Voraussetzung:** ENV-Cleanup gemacht, edge-shim.js eingebunden

---

## Test-Setup

1. Browser: Chrome/Firefox mit DevTools (F12)
2. Stage-URL: https://app.prova-systems.de (nach Build erfolgreich)
3. Test-Account: dein eigener Marcel-Account (Admin-Whitelist)
4. Optional: Inkognito-Tab für Cookie-/Cache-frisch

**Console-Tab beobachten** für:
- ✅ `[edge-shim] active — rerouting /.netlify/functions/* → ...`
- ✅ `[edge-shim] reroute <function-name> → ...`
- ❌ Rote Errors / 401/403/500/CORS-Fails

---

## Smoke-Test-Sequenz

### A. Public Pages (kein Login)

| Page | Was prüfen | Erwartung |
|---|---|---|
| `/` (Landing) | Lädt? Stats-Section füllt sich? | Keine Console-Errors |
| `/pricing.html` | Beide Tier-Karten? Stripe-Buttons? | Solo 179€ / Team 379€ |
| `/status.html` | Service-Status-Kacheln laden? | Alle "green" oder "yellow" |
| `/health-test-down.html` | health-Endpoint zeigt JSON | `{ "status": "ok", ... }` |
| `/datenschutz.html` etc. | Legal-Pages laden statisch | Plain HTML |

### B. Auth Flow

| Schritt | Was prüfen | Erwartung |
|---|---|---|
| `/auth-supabase.html` Login | Email+Passwort, Submit | Redirect zu Dashboard |
| Console nach Login | Network-Tab: tokens? | Bearer-Header gesetzt |
| `/dashboard.html` | Lädt Begrüßung, Widgets? | Console: shim-reroutes |
| Dashboard-Reload | Bleibt eingeloggt? | Session via localStorage |
| Logout-Button | Beendet Session? | Redirect zu Landing |

### C. Akte-Flow (Welle 4 Edge-Functions)

| Schritt | Was prüfen | Edge-Function |
|---|---|---|
| Dashboard → "Neuer Auftrag" | Wizard öffnet | (Frontend) |
| Daten eingeben + Speichern | Akte angelegt | `auftraege-update` |
| Akte → "Eintrag hinzufügen" | Eintrag-Modal | `eintraege-create` |
| Foto hochladen | Bild lädt + thumb | `foto-upload` |
| Skizze zeichnen | Canvas-Save | `skizze-save` |
| Frist anlegen | Termin-Eintrag | `fristen-create` |
| Fristen-Liste | Lädt fristen | `fristen-list` |

### D. PDF/Document-Flow (Welle 5 Edge-Functions)

| Schritt | Was prüfen | Edge-Function |
|---|---|---|
| Akte → "PDF generieren" | PDF-URL kommt | `pdf-generate` / `generate-pdf-mode-c` |
| Foto-Anlage-PDF | Anhang erstellt | `foto-anlage-pdf` |
| DOCX-Export | Word-Datei | `editor-docx-export` |
| Akte-Export ZIP | Download startet | `akte-export` |
| Bescheinigung | PDF + Aktenzeichen | `bescheinigung-generate` |
| Rechnung mit ZUGFeRD | XML embedded | `rechnung-zugferd` |

### E. KI-Flow (Welle 2 Edge-Functions)

| Schritt | Was prüfen | Edge-Function |
|---|---|---|
| Akte → "KI Konjunktiv-Check" | Suggestions | `ki-konsistenz-check` |
| Diktat aufnehmen | Whisper transkribiert | `whisper-diktat` |
| Diktat strukturieren | Absätze | `ki-diktat-strukturierung` |
| Foto → "Caption" | Beschreibung | `foto-captioning` |
| KI-Statistik | Token-Verbrauch | `ki-statistik` |

### F. Stripe/Billing (Welle 3 Edge-Functions)

| Schritt | Was prüfen | Edge-Function |
|---|---|---|
| Pricing → Plan wählen | Stripe Checkout | `stripe-checkout` |
| Test-Card durchziehen | Webhook fires | `stripe-webhook` |
| Einstellungen → Subscription | Status sync | `admin-billing-sync` |
| "Manage Subscription" | Stripe Portal | `stripe-portal` |
| Pilot-Seats prüfen | Seat-Counter | `pilot-seats` |

### G. DSGVO/Compliance (Welle 6 Edge-Functions)

| Schritt | Was prüfen | Edge-Function |
|---|---|---|
| Cookie-Banner | Speichert Choice | `cookie-consent-log` |
| Login → Re-Consent-Modal | Falls neue Version | `re-consent-pending` |
| Re-Consent zustimmen | INSERT | `re-consent-submit` |
| Einstellungen → 2FA-Setup | QR-Code | `auth-2fa-setup` |
| 2FA-Code eingeben | Aktiviert | `auth-2fa-verify` |
| DSGVO-Daten exportieren | JSON-Download | `dsgvo-portabilitaet` |
| DSGVO-Löschung beantragen | 30d-Email | `dsgvo-loeschen-antrag` |

### H. Admin-Cockpit (Welle 7 Admin Edge-Functions)

| Schritt | Was prüfen | Edge-Function |
|---|---|---|
| `/admin-cockpit.html` öffnen | 2FA-Check | `admin-system-health` |
| Section "MRR" | Live-Zahl | `admin-mrr-live` |
| Section "Funnel" | Steps & %-Drops | `admin-funnel` |
| Section "Churn" | Liste mit Reasons | `admin-churn` |
| Section "KI-Costs" | Token+€ pro Modell | `admin-ki-costs` |
| Section "Sentry-Errors" | Letzte Issues | `admin-sentry-errors` |
| Section "Push-Alerts" | Letzte 24h | `admin-push-alerts` |
| Section "PDF-Queue" | Pending Jobs | `admin-pdf-queue` |
| Section "Time-Tracking" | Lifecycle-Avg | `admin-time-tracking` |
| Section "Support-Inbox" | Offene Tickets | `admin-support-inbox` |
| Section "Pseudonym-Audit" | 7/7 grün | `admin-pseudonymisierung-audit` |
| "Force-Logout User" | Sessions weg | `admin-force-logout` |
| "Send Email" | Resend-Mail | `admin-send-email` |
| "Cache Clear" (No-Op) | Audit-Eintrag | `admin-cache-clear` |
| "Impersonate Workspace" | Read-Only-Token | `admin-impersonate` |
| "ENV-Status" | Alle ✅ | `admin-env-status` |

### I. Onboarding (Welle 7 Onboarding Edge-Functions)

| Schritt | Was prüfen | Edge-Function |
|---|---|---|
| Neuer User Signup | Workspace erstellt | `provision-sv` |
| Demo-Fall öffnen | SCH-DEMO-001 | `create-demo-akte` |
| Demo-Komplett-Setup | Auftrag+Kontakt+Frist | `onboarding-create-demo` |
| Demo entfernen | Cleanup | `onboarding-delete-demo` |

### J. Import-Wizard (Welle 7)

| Schritt | Was prüfen | Edge-Function |
|---|---|---|
| Einstellungen → Import | CSV-Upload | (Frontend) |
| Validate-Step | Errors/Warnings | `import-validate` |
| Execute-Import | Records created | `import-execute` |
| Rollback (Undo) | Records deleted | `import-rollback` |

---

## Bekannte deferred Functions

Diese Functions liefern absichtlich `501 NOT_IMPLEMENTED`:

- `parse-beweisbeschluss` — pdf-parse Node-spezifisch, post-pilot Migration
- `parse-docx` — mammoth Node-spezifisch, post-pilot Migration

Frontend muss Fallback haben (manuelles Eingeben). Falls nicht da: TODO für nach Pilot.

---

## Wenn etwas failt

### 401 trotz Login
- Token expired? Logout+Login.
- supabase.auth.getSession() leer? Check localStorage `sb-*-auth-token`.
- Edge-Shim Token nicht extrahiert? Console: was loggt `[edge-shim]`?

### 403 bei Admin-Functions
- Nicht in Admin-Whitelist (`admin-auth.ts:HARDCODED_ADMIN_EMAILS`)?
- 2FA nicht aktiviert? `aal !== 'aal2'` → in Supabase Auth → User → Enable MFA → TOTP.
- `PROVA_ADMIN_REQUIRE_2FA` Env nicht auf `true`?

### 500 von Edge
- Logs prüfen: Supabase Dashboard → Edge Functions → <function-name> → Logs
- Häufig: ENV-Variable fehlt (z.B. `RESEND_API_KEY`)

### CORS-Errors
- Edge gibt `Access-Control-Allow-Origin: *` zurück
- Frontend macht falsche Methoden? Edge-Shim erwartet POST/GET/OPTIONS

### Network-Tab nichts
- `window.PROVA_EDGE_SHIM_DISABLED` versehentlich gesetzt?
- `lib/edge-shim.js` nicht geladen? Network-Tab: 200 für `/lib/edge-shim.js`?

---

## Erfolgs-Kriterium

**Alle Sektionen A-I komplett ohne Console-Errors → Pilot-Live-Ready.**

Falls einzelne Sektionen rot: dokumentieren als "post-pilot Fix" und trotzdem mit Pilot starten (Bekannte Limitierungen).
