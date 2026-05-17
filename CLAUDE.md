# PROVA Systems — CC-Arbeitsregeln

**KI-natives SaaS für ö.b.u.v. Bausachverständige.** Workflow: Auftrag → Diktat → KI-Strukturhilfe → §6 Fachurteil → Freigabe → PDF → Rechnung. Solo-SVs (5–30 Fälle/Monat) + Team-Büros, 4 Flows (A=Schaden, B=Wert, C=Beratung, D=Baubegleitung). Vanilla JS, kein React.

Bei Details/Spezialfällen → `docs/CLAUDE-DETAIL.md` öffnen. Diese Datei = nur stabile Kern-Regeln.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla JS + HTML/CSS, kein Framework |
| DB/Auth/Storage | Supabase Postgres (Project `cngteblrbpwsyypexjrv`, Frankfurt) |
| Backend | Supabase Edge Functions (Deno/TS) + Netlify Functions (Bridge) |
| Workflow | Make.com (noch aktiv, Migration zu pg_cron läuft) |
| PDF | PDFMonkey via Edge Function |
| KI | OpenAI gpt-5.5 + gpt-5.5-instant + whisper-1 (4o/4o-mini deprecated Feb 2026) |
| Zahlung | Stripe Live |
| Hosting | Netlify, `prova-systems.de` (Landing) + `app.prova-systems.de` (App) |

## Fixe IDs

- **Marcel User**: `68b27e9e-c32c-415d-9775-ce7273881861`
- **Marcel Workspace** (`workspace_memberships`, rolle `owner`): `65b25a13-17b7-45c0-b567-6edee235dd98`
- **Supabase Project**: `cngteblrbpwsyypexjrv`
- **Repo**: `C:\PROVA-Systems\prova-systems\GitHub\prova-systems`
- **Stripe Live**: Solo `price_1TSjMZRXumrtL2n5fgToRwyr` (179€), Team `price_1TSjNXRXumrtL2n56c6emN2k` (379€). Add-ons: 5F `price_1TSl2JRXumrtL2n52XSz85oC`, 10F `price_1TSl3fRXumrtL2n5Gur4BmWL`, 20F `price_1TSl4eRXumrtL2n5tIWx0ET8`. Coupons: `FOUNDING-99`, `FRIEND-50`, `WERBER-MONAT-FREI`.

## Harte Regeln (niemals brechen)

1. **`node --check` vor jeder JS-Auslieferung** — Syntax-Error stoppt alles.
2. **`sw.js` CACHE_VERSION inkrementieren** in JEDEM Commit, der eine JS/CSS-Datei aus dem APP_SHELL ändert. Kein Sammel-Bump.
3. **RLS-Pflicht**: jeder Write/Read über Supabase-RLS via `workspace_id`. Service-Role-Key NIE im Frontend. Bei INSERT `workspace_id` explizit setzen (kein Default).
4. **Pseudonymisierung VOR jedem OpenAI-Call** — Namen/Adressen/IBAN durch Platzhalter ersetzen, server-side in `ki-proxy`.
5. **Jeder KI-Call loggt** in `ki_protokoll`: workspace_id, user_id, funktion, modell, tokens_in/out, kosten_eur, auftrag_id.
6. **GPT/OpenAI/Whisper-Namen NIE in UI** — außer in §407a-Compliance-Texten.
7. **Konjunktiv II Pflicht** bei KI-Kausalaussagen ("liegt nahe, dass…"), nicht assertiv.
8. **HALLUZINATIONSVERBOT**: KI gibt nur Diktat-/Stamm-Inhalt wieder, erfindet nichts. Check vor Freigabe automatisch.
9. **§6 Fachurteil = SV-Eigenleistung**: KI ist opt-in, S1/S2/S3-Stufen getrennt, 500-Zeichen-Gate + 2/3 Quality-Marker (Norm/Konjunktiv/§-Verweis), Override mit Modal + `audit_trail`-Eintrag.
10. **Konjunktiv-II-Check nur mit gpt-5.5** (nicht instant) — instant scheitert an deutscher Grammatik reproduzierbar.
11. **Vanilla JS bleibt** — kein React/Vue/Svelte je einführen.
12. **Schema-Änderungen versioniert**: neues File in `/supabase-migrations/<NN>_<verb>_<topic>.sql` mit fortlaufender Nummer. Niemals direkt im Supabase-Dashboard Production-Schema ändern.
13. **Idempotente DDL**: `CREATE TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`, `DO $$ … EXCEPTION END $$` für ENUMs. GENERATED Columns nur mit IMMUTABLE Functions.
14. **Edge-Function-Audit**: bei state-changing Ops Eintrag in `audit_trail` mit function_name + pseudonymisiertem payload + result.
15. **Stripe-Webhook idempotent** — Duplicate-Event → 200 zurück, nicht erneut verarbeiten (UNIQUE in `stripe_events.stripe_event_id`).
16. **Legal-Pages bleiben am Root** (impressum/datenschutz/agb/avv.html) — 48+ Cross-Refs.
17. **Cloudflare-Email-Obfuscation AUS** (`skip_processing = true` in netlify.toml).
18. **Co-Founder-Ownership**: bei Unsicherheit nicht raten, Marcel fragen.

## Niemals wrappen / antasten

Diese Netlify Functions sind extern registriert oder zeitkritisch — **NIE in 410-Wrapper packen**:

- `stripe-webhook`, `stripe-webhook-referral`, `stripe-checkout`, `stripe-portal` (Stripe-Dashboard hat URLs registriert)
- `ki-proxy`, `pdf-proxy`
- Alle `*-cron`-Functions (Netlify-Scheduler aktiv)
- `make-*`-Webhook-Receiver, `make-proxy` (Make.com bis Cutover aktiv)
- `smtp-credentials`, `smtp-senden` (IONOS-SMTP)

## Anti-Patterns

- ❌ Pricing ändern (Solo 179€/Team 379€ fix, Stand 08.05.2026)
- ❌ Service-Role-Key im Frontend benutzen
- ❌ KI fachliche Bewertung schreiben lassen
- ❌ DSGVO-Klardaten an OpenAI ohne Pseudonymisierung
- ❌ CACHE_VERSION-Bump vergessen
- ❌ Legal-Pages in Subfolder verschieben
- ❌ Schema direkt im Supabase-Dashboard Production ändern
- ❌ KI-Calls ohne `ki_protokoll`-Logging schreiben
- ❌ Files aus früheren Sessions blind übernehmen ohne aktuelles Repo-File zu lesen
- ❌ Bei Unsicherheit raten — IMMER fragen oder im Repo prüfen
- ❌ Cloudinary/Airtable-Files brechen vor finalem Cutover

## Kommunikation mit Marcel

- Deutsch, direkt, Co-Founder-Ton (kein Assistent)
- Bei Bugs: ehrlich was schiefging, nicht beschönigen
- Bei Unsicherheit: stoppen + fragen, nicht raten
- Liefer-Format pro Sprint: (1) was geändert (File-Liste), (2) warum (Sprint-Bezug), (3) was Marcel testen soll (Klick-Checkliste max 10 Punkte), (4) bekannte Limits

## Compounding Lessons (CC ergänzt selbst nach Fehlern)

- **`resolveUser()` immer `await`** — Function ist async, in `pdf-proxy.js` als Lurking-Bug gefunden.
- **Stripe-Trial-Logic**: `payment_method_collection: 'always'` setzen sonst keine Kartenverifikation.
- **Module-Mocks in Tests**: Module-Cache via `Module._cache[require.resolve(...)] = { ..., exports: ... }` invalidieren VOR `require(target)`.
- **`git push` ohne Marcel-OK**: settings.json `ask`-Liste schützt — nie umgehen.
- **Audit-Integrity-Hash-Chain** (MEGA⁸⁴/⁸⁵ Pass 2c Block G): `integrity_hash = sha256(prev_hash || canonicalJson({workspace_id,user_id,action,entity_*,payload,source,task}))`. `canonicalJson()` sortiert Keys → stabile Hashes. Pattern in `supabase/functions/audit-log-v1/index.ts` referenzierbar. Tampering bricht Kette für alle nachfolgenden Einträge.
- **Additive Strategy bei Multi-Tab-Pages**: bestehende Tabs nicht refactorn, neue Tabs hinzufügen + Filter/Render/Empty-State pro Tab branchen. `bibliothek.html` Pass 2c als Referenz: 2 Tabs → 5 Tabs mit ~190 Z additiv, 0 Z Breaking.
- **Pilot-Blocker = Verify-First** (MEGA⁸⁶ Block A): Bei wiederholten User-Reports zu „Bug-XY" (mehrfach gemeldet seit Wochen) zuerst Architektur-Audit machen — oft sind Fixes bereits implementiert (MEGA47/68/69/80 Diktat-Race war 4-fach defensive done). Doku mit Reproducer + Diagnose-Logging hat mehr Wert als noch-ein-Fix.
- **Cross-Domain-Auth 3-Layer-Pattern** (post-MEGA⁸³ + MEGA⁸⁶ A.1): Layer 1 = `crossDomainStorage` Adapter in `lib/supabase-client.js` schreibt Supabase-Session-Cookie auf `.prova-systems.de`. Layer 2 = `ProvaLegacyBridge` schreibt 5 Legacy-Keys Cross-Subdomain. Layer 3 = `auth-guard.js` liest aus localStorage (durch Bridge hydrated). Wenn 1 Layer fehlt → Doppel-Login. Diagnose via `console.log('[ProvaLegacyBridge] hydrate: …')` in hydrate().
- **Drawer-Pattern via Iframe-Embed + postMessage** (MEGA⁸⁶ Block C): Vermeidet Inline-Reimplementierung großer Pages — `bibliothek.html?embedded=1` versteckt Sidebar+Header per body-Class, postet Insert-Events an Parent-Window. Parent reagiert via `addEventListener('prova:bib-insert', ...)`. Pattern in `lib/prova-bibliothek-drawer.js` referenzierbar.
- **Memory ≠ DB-Wahrheit** (MEGA⁸⁷ Block A): Marcel-Memory zu `member_rolle` ENUM (super_admin/admin/sv/member/viewer) war falsch — DB hatte `{owner,admin,sv,assistenz,readonly}`. Pattern: bei jedem Auth/Permission-Sprint zuerst SQL `enum_range(...)` ausführen statt Memory vertrauen.
- **Recovery-Codes Hash-Strategie** (MEGA⁸⁷ Block D): sha256 statt bcrypt für TOTP-Recovery-Codes — Performance (10ms vs 100ms) + Linear-Search über 10 Codes akzeptabel + Salt unnötig bei 32^8 Entropie. Constant-time Compare via eigene `timingSafeEqual`-Implementation. Plaintext-Code-Format `XXXX-XXXX` aus 32-Alpha ohne I/O/0/1 für Lesbarkeit.
- **Polyfill als bewusste Compat-Architektur** (MEGA⁸⁷ Block B): Wenn 14+ Production-Files eine alte API (`window.netlifyIdentity.*`) callen, lieber Polyfill-Lib (~140 Z) die intern auf neue Stack umleitet — als 14-File-Refactor. `lib/netlify-identity-polyfill.js` als Referenz.
- **Logo-Asset-Hierarchie** (MEGA⁸⁸-A): 4 SVG-Varianten pro Brand — **Master** (Voll, Marketing+PDFs+Auth-Cards), **Compact** (App-Sidebar Expanded), **Icon-only** (Favicon+PWA+Sidebar-Collapsed+2FA-Display), **Mono** (Footer+Stempel+Druck). PNG-Generation via Node-Script (`tools/generate-logo-pngs.js` + sharp + png-to-ico, einmaliger Marcel-Run). Dark-BG-Cards brauchen `filter:brightness(0) invert(1);` für white-Variante. TOTP-URI image-Param funktioniert nur wenn QR selbst gerendert wird (Supabase MFA enroll() liefert default qr_code ohne Param — workaround via `data.totp.uri` + `api.qrserver.com`).
- **Supabase MFA Two-Worlds-Pattern** (MEGA⁸⁸-C): `auth.mfa_factors` ist Source-of-Truth (Supabase MFA-API arbeitet ausschließlich darauf). Custom `public.users.totp_enabled`-Flag muss via DB-Trigger gesynct werden (`AFTER INSERT/UPDATE/DELETE ON auth.mfa_factors` → `UPDATE users SET totp_enabled=...`, Migration 62 als Referenz). **PLUS:** Frontend-JWT bleibt nach `mfa.verify()` im aal1-Cache — Edge-Check sieht `auth.jwt()->>'aal' = 'aal1'` → 400. Pflicht: `await supabase.auth.refreshSession()` + ~150ms-Buffer für Trigger-Roundtrip vor jedem aal2-abhängigen Edge-Call. Edge selbst liest auth.mfa_factors PRIMARY (`.schema('auth').from('mfa_factors').eq('status','verified')`) statt users.totp_enabled — robust gegen Sync-Drift.
- **Coupon-Codes niemals hartcoded im Frontend** (MEGA⁸⁸-D Block A): Real-Coupon-Strings (FOUNDING-99 etc.) als Klartext in JS oder HTML = Security-Risk (jeder User kann Code einlösen, lifetime-Discounts verlieren €€€/Monat pro Missbrauch). Pattern: User-spezifischer Coupon in `workspaces.stripe_coupon_assigned` (DB only) + Founding-Status-Flag (`workspaces.founding_status`). Frontend zeigt Status („Coupon wird automatisch angewendet"), NIEMALS Code. Stripe-Checkout-Edge liest workspace und pre-applied `discounts: [{ coupon: <code> }]`. Plus: Stripe-Side `max_redemptions` limitieren + `valid_until` setzen.

---

*Detaillierte Regeln (Repo-Struktur, Sprint-Workflow, Tooltip/Empty-State-Patterns, Power-Tools, KI-Funktionstests, Edge-Function-Templates) → `docs/CLAUDE-DETAIL.md`*
