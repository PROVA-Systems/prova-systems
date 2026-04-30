# 🚀 PROVA — Quick-Start für nächsten Browser-Claude-Chat

**Datum:** 30.04.2026 abend
**Status:** APP-LANDING-SPLIT live, Tag `v200-app-landing-split-done` gesetzt
**Smoke-Test:** 15/15 PASS ✅

---

## Erste Nachricht an den neuen Chat

Marcel kopiert das hier 1:1 als allererste Nachricht in einen frischen Browser-Claude-Chat:

---

**START-COPY**

Lies bitte (in dieser Reihenfolge):

1. `docs/sprint-status/PROVA-CHAT-TRANSPORT-v35.md` (final · 30.04.2026 abend)
2. `docs/sprint-status/PHASE-4-CUTOVER-DONE.md`
3. `docs/PROVA-VISION-MASTER-v2.md` *(falls vorhanden — Übergabe Ü1b pending)*
4. `docs/PROVA-SPRINTS-MASTERPLAN-v2.md` *(falls vorhanden — Übergabe Ü1c pending)*
5. `docs/PROVA-REGELN-PERMANENT-v2.md` *(falls vorhanden — Übergabe Ü1d pending)*

Ich bin Marcel von PROVA Systems. Wir machen weiter, wo wir aufgehört haben.

**Aktueller Stand:** APP-LANDING-SPLIT komplett LIVE seit 30.04.2026 abend. Tag `v200-app-landing-split-done` gesetzt + gepusht. Smoke-Test 15/15 PASS. Workspace-ID `65b25a13-17b7-45c0-b567-6edee235dd98` aktiv.

**Live-Architektur:**
- `prova-systems.de` = LANDING (Marketing + Legal, DM Sans + Navy)
- `app.prova-systems.de` = SaaS-App (Login-protected, Supabase-Auth)
- `/login` als kanonische Login-URL (PROVA-Branding, 2 Tabs Anmelden/Registrieren)
- 30+ Cross-Domain-Redirects + 37 host-spezifische App-Path-Rewrites

**Nächste Sprints (priorisiert):**

1. **Schema-Migration 06b applizieren** — `PLANNED_06b_auftraege_extend.sql` reviewen, in versioniertes File umbenennen, Supabase-Dashboard SQL-Editor ausführen. 2 Spalten + 1 ENUM. Voraussetzung für Sprint 06c.

2. **Sprint 06c Live-Save aktivieren** — `auftrag-neu-logic.js` LocalStorage-Draft auf `auftraege.createDraft()` umstellen, Beteiligte-Picker statt Plaintext, Kontakt-Picker auf Phase 1A.

3. **UX-Entscheidung Sprint-06b-Skeleton** — Branch `feature/sprint-06b-auftrag-neu-skeleton` wartet. Frage: COCKPIT-Eintrag „Neuer Auftrag" + Sidebar-Split-Button parallel halten (A) oder einer entfernen (B/C)? Browser-Claude-Empfehlung: C (nur Split-Button).

4. **Cluster-Review-Freigaben** — `docs/sprint-status/CLUSTER-REVIEW-AUTO.md` reviewen:
   - 24 Pages sofort löschbar (nur Catalog-Reste)
   - 6 INVESTIGATE-Pages klären (vorlage-09, mahnung-1/2/3, mahnwesen, schnelle-rechnung)
   - 2 pdfmonkey-Templates: löschen oder nach `docs/templates-source/` verschieben?

5. **Pilot-Onboarding-Vorbereitung:**
   - Stripe-Webhook-Secret erneuern (Produktiv-Setup)
   - Make-Scenario T3 (Trial-Reminders) manuell aktivieren
   - Make-Scenario F1 (Founding-Coupon mit `FOUNDING-99`) manuell aktivieren
   - `index.html` Pricing-Diskrepanz angleichen (Zeile 1809: 25 → 30 Aufträge)

**Tonalität & Arbeitsweise:**

- Sei mein Co-Founder, System-Architekt, UX-Architekt — nicht Assistent.
- **Top-1%-Tempo, recherche-fundiert, sicher-vor-Speed.** Bei Unsicherheit lieber fragen als raten (CLAUDE.md Regel).
- **Claude Code arbeitet parallel.** Du gibst die Strategie + Reviews, Claude Code führt aus. Wir koordinieren über Branch-Namen + PR-Reviews.
- **Deutsch.** Direkt und sachlich. Keine Marketing-Floskeln. Bei Bugs ehrlich, was falsch lief.

**Letzte Lessons-Learned (für Awareness):**

- **Netlify Path-Order:** `_redirects` path-only feuert VOR `netlify.toml` host-conditioned. Bei Cross-Domain-Setups → ALLE Path-Rewrites host-explizit. (Hotfix `redirect-precedence` heute Phase 4.)
- **IONOS CNAME:** `app` muss auf `prova-systems.netlify.app` zeigen, NICHT auf `prova-systems.de` (Zirkel → kein SSL-Cert).
- **Service-Role-Pattern:** Edge Functions mit Multi-Tenant-Writes nutzen Service-Role-Key für Storage+Insert, User-JWT nur für Reads. workspace_id wird server-side aus User-JWT verifiziert.

**END-COPY**

---

## Was Marcel davor checken sollte (vor neuem Chat)

- [ ] Master-Files-v2 (Vision/Sprints/Regeln) lokal saved? (Übergabe Ü1b/c/d ausstehend)
- [ ] `docs/PROVA-MARCEL-SELBSTHILFE.md` ins Project-Knowledge geladen?
- [ ] Letzten Stand `git pull origin main` (Tag v200 ist neueste Position)?

## Diese Datei selbst

Nach Master-Files-v2-Update (Ü1b/c/d) bitte die Sterne `*(falls vorhanden …)*` aus der Reading-Order entfernen.

---

*Quick-Start-Datei erstellt 30.04.2026 abend. Bei Inhalts-Änderungen: parallel `docs/sprint-status/PROVA-CHAT-TRANSPORT-v35.md` aktuell halten.*
