# MEGA⁶⁸-FINAL-1 — Bug-Fix + Pipeline-Glue

**Datum:** 2026-05-12
**Sprint:** MEGA⁶⁸-FINAL-1 (Sub-Sprint 1 von 3, nach Phase-A-Audit-Split)
**Status:** ✅ COMPLETE
**Vorgänger:** MEGA⁶⁸ Original (v3100, Externe + IHK + SMTP)
**Nachfolger:** MEGA⁶⁸-FINAL-2 (Vollständigkeits-Lücken: Global-Search, Bibliothek, Skizze-Editor, Mahnwesen, Fristen-Kalender)

---

## TL;DR

Phase B (3 Pilot-Blocker) **gefixt** — Diktat-Mode-Bug war einziger Fix nötig, die anderen
zwei waren bereits seit MEGA³⁹/⁵⁰/³¹ aktiv. Phase D-Lückenschluss: IHK-Toggle in Versand-Modal
sichtbar. Phase E.3: Cmd+K bekommt 17 neue Navigation+Quick-Create-Commands.
Phase E.1 (Asset-Wiring) ist offen — deferred auf FINAL-2 (existing Upload-Pfade haben keinen
sauberen audio_id-Pipeline-Hook im Frontend, müssen erst inspiziert werden).

---

## Items

### Phase B — Pilot-Blocker ✅

| Bug | Status | Fix |
|---|---|---|
| B.1 Login-Doppel-Eingabe | ✅ verified (kein neuer Fix) | `lib/supabase-client.js` Cookie-Domain-Adapter aktiv seit MEGA³⁹ Phase 10 |
| B.2 Index/App-Split | ✅ verified (kein neuer Fix) | `netlify.toml` v6.0 Block A/B/C seit MEGA⁵⁰ + MEGA³¹ C1 |
| B.3 Diktat-Mode-Bug | ✅ **JETZT gefixt** | `ortstermin-modus.html` neue Function `autoStopDiktatBeiTextEingabe()` + onfocus-Hooks |

### Phase D-Lückenschluss ✅

- **IHK-Toggle UI im Versand-Modal:** Radio-Group "Standard | IHK" im Download-Tab. Klick auf "PDF generieren" ruft `ihk-export` Edge Function statt `pdf-generate` wenn IHK-Mode gewählt.
- **parse-docx-Roundtrip in anhang-process:** **DEFER** auf MEGA⁶⁸-FINAL-2 (Edge Function existiert, Roundtrip-Integration braucht parse-docx-Schema-Inspektion).

### Phase E.1 — Asset-Wiring ⏳ DEFER

- `ProvaAssetEventBus` (`lib/prova-asset-event-bus.js`) ist da, Pattern bereit.
- `ortstermin-modus.html`/`whisper-chunker.js` haben aber **keinen direkten `audio_id`-Pipeline-Hook im Frontend** — Audio-Upload + audio_dateien-Insert läuft serverseitig im `whisper-diktat` Edge.
- Wiring-Strategie für FINAL-2: entweder Edge Function `whisper-diktat` emittet via Edge-Response-Header `X-Prova-Audio-Id` und Frontend dispatcht Event, ODER Frontend pollt `audio_dateien` nach Upload und matched über filename.

### Phase E.3 — Cmd+K Navigation-Commands ✅

`lib/prova-commands-registry.js` erweitert um **17 neue Commands** in 2 neuen Kategorien:

**Kategorie F — Seiten (15 Commands):**
- `page.dashboard` (🏠 Dashboard)
- `page.akte` (📂 Aktuelle Akte)
- `page.kontakte` (👥)
- `page.termine` (📅)
- `page.fristen` (⏰)
- `page.rechnungen` (💶)
- `page.mahnwesen` (⚠)
- `page.briefe` (✉)
- `page.beratung` (☎)
- `page.baubegleitung` (🏗)
- `page.stellungnahme` (⚖)
- `page.ortstermin` (🎙)
- `page.normen` (📐)
- `page.textbausteine` (📝)
- `page.einstellungen` (⚙)

**Kategorie G — Neu (2 Commands):**
- `new.auftrag` (➕ Neuer Auftrag)
- `new.brief` (➕✉ Neuer Brief)

Cmd+K → tippe Name → Navigation per Enter. Aliases unterstützen Fuzzy-Match
(z.B. "kalender" findet termine, "dunning" findet mahnwesen).

### Phase F — Polish ✅

- `sw.js` CACHE_VERSION: `prova-v3100-mega68-externe-ihk-smtp` → **`prova-v3110-mega68-final-1-pilot-blocker`**
- `docs/CHANGELOG.md` neu mit Phase B Bug-Doku
- `docs/sprint-status/MEGA68-FINAL-WORKFLOW-INVENTAR.md` (Phase A Output)
- Dieses Dokument

---

## Verifikation

| Check | Status |
|---|---|
| `ortstermin-modus.html` Auto-Stop-Logic added | ✅ |
| Cross-Domain-Auth-Code in supabase-client.js verified | ✅ |
| netlify.toml Cross-Domain-Redirects verified | ✅ |
| `lib/prova-versand-modal.js` IHK-Toggle UI | ✅ Syntax-Check grün |
| `lib/prova-commands-registry.js` +17 Commands | ✅ Syntax-Check grün |
| `sw.js` v3110-mega68-final-1 | ✅ |

---

## Marcel-Test (8 Min)

```
1. Service Worker Unregister + Reload → sw.js v3110

2. Cross-Domain-Login (B.1):
   - https://prova-systems.de öffnen, einloggen
   - Klick "App" oder navigiere zu app.prova-systems.de
   - Erwartung: KEINE erneute Login-Aufforderung
   - Wenn doch: lib/supabase-client.js COOKIE_DOMAIN verifizieren (.prova-systems.de)

3. Index/App-Split (B.2):
   - https://prova-systems.de zeigt Landing
   - https://app.prova-systems.de redirected zu /dashboard
   - Bookmarked URLs (z.B. https://prova-systems.de/akte) → 301 zu app.

4. Diktat-Mode-Bug (B.3 NEU):
   - /ortstermin öffnen, Aufnahme starten (🎙 Button)
   - In Befund-Notizen-Textarea klicken (rechts unten)
   - Erwartung: Toast "🎙 Diktat gestoppt — manuelle Eingabe erkannt"
   - Recording-Indicator wird grau
   - Test 2: in Transkript-Edit-Field klicken → gleicher Auto-Stop

5. IHK-Toggle (Phase D):
   - Versand-Modal öffnen (Cmd+K → "Versenden")
   - Download-Tab → Radio "IHK-Köln-Export"
   - Klick "PDF generieren" → ihk-export Edge Function liefert HTML mit gemergedem Teil 3+4

6. Cmd+K Navigation (Phase E.3):
   - Cmd+K → tippe "kalender" → "Termine" oben in Treffer
   - Enter → /termine geöffnet
   - Cmd+K → "dunning" → Mahnwesen (Aliases funktionieren)
   - Cmd+K → "neuer auftrag" → /auftrag-neu
```

---

## Bekannte Lücken / TODOs für MEGA⁶⁸-FINAL-2

| Item | Sprint |
|---|---|
| Asset-Wiring E.1 (whisper-diktat → audio_id-Event) | MEGA⁶⁸-FINAL-2 |
| parse-docx-Roundtrip in anhang-process | MEGA⁶⁸-FINAL-2 |
| **Phase C komplett:** Global-Search Cmd+K, 360-Kontakt, Aktivität, Bibliothek, Fristen-Kalender, Mahnwesen-UI, Skizze-Editor | MEGA⁶⁸-FINAL-2 |
| **Phase E.2/E.4/E.5/E.6:** Workflow-Engine, Dashboard, Akte-Tabs, Brüche fixen | MEGA⁶⁸-FINAL-3 |

---

## File-Liste

### GEÄNDERT
```
ortstermin-modus.html             B.3-Fix: autoStopDiktatBeiTextEingabe() + onfocus-Hooks
lib/prova-versand-modal.{js,css}  Phase D: IHK-Toggle Radio im Download-Tab
lib/prova-commands-registry.js    Phase E.3: +17 Navigation/Neu-Commands
sw.js                             CACHE_VERSION → v3110-mega68-final-1-pilot-blocker
```

### NEU
```
docs/CHANGELOG.md                                 Phase B Bug-Doku
docs/sprint-status/MEGA68-FINAL-WORKFLOW-INVENTAR.md   Phase A Audit-Output
docs/sprint-status/MEGA68-FINAL-1-PILOT-BLOCKER.md     (dieses)
```

### UNVERÄNDERT (verified)
```
lib/supabase-client.js     Cross-Domain-Cookie-Adapter aktiv
netlify.toml               Block A/B/C Cross-Domain-Redirects aktiv
```

---

## Quellen (Recherche-Mandat MEGA⁶⁸-FINAL)

Phase B Fixes brauchten nur Code-Inspektion + DB-Auth-Doku. Recherche-Mandat für SV-Workflows folgt in FINAL-2 (Phase C Bibliothek-Normen) und FINAL-3 (Phase E Workflow-Engine pro auftrag_typ):

1. IHK Sachverständigenordnung (BIH-Mustertext)
2. BVS Verbandsrichtlinien (Bundesverband ö.b.u.v. SVs)
3. IfS Köln Praxis-Handbuch
4. §407a–414 ZPO
5. JVEG (Justizvergütungs- und -entschädigungsgesetz)
6. BGB §286 ff (Mahnwesen-Verzug)
7. DIN 1961 / VOB-B
8. EU AI Act Art. 50
9. LG Darmstadt 10.11.2025 Az. 19 O 527/16
10. PROVA-VISION-MASTER.md (4-Flow-Architektur)
11. NinjaAI Session 4 (Workflow-Sparring)
12. NinjaAI Session 5 (Editor + Skizze-Pattern)
13. CLAUDE.md / PROVA-REGELN-PERMANENT.md (Marcel-Direktiven)

---

## TAG-Empfehlung

`v3110-mega68-final-1-pilot-blocker` nach Marcel-Test + Push.

**Sub-Sprint-Status MEGA⁶⁸-FINAL:**
- ✅ FINAL-1 (Bug-Fix + Glue) — **dieses Dokument**
- ⏳ FINAL-2 (Vollständigkeit: Global Search, Bibliothek, Skizze-Editor, Mahnwesen, Fristen) — 20-28h
- ⏳ FINAL-3 (Workflow-Heilung: Engine, Dashboard, Akte-Tabs) — 18-25h

---

*Ende MEGA⁶⁸-FINAL-1 · Pilot ist entblockt, Cmd+K wird zentrale Navigation.*
