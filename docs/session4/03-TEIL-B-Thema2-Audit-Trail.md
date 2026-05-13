# TEIL B · Thema 2 — Audit-Trail: verständlich UND gerichtsfest

**Die Frage:** audit_trail enthält technische JSONs. Soll SV das lesen? Wie macht man's verständlich ohne juristische Kraft zu verlieren?

---

## Das Problem in einem Satz

Der technische Audit-Trail ist **Pflicht** (DSGVO Art. 30 ROPA, §407a ZPO Offenlegung, LG Darmstadt). Aber er ist **unlesbar** für Menschen. Ergo: Zwei-Sichten-Strategie.

## Die Zwei-Sichten-Strategie (Two-View Audit)

Nicht wählen, nicht vereinen — **parallel bauen**.

### Sicht 1: Technical-Log (bleibt wie heute)
- `audit_trail` Tabelle, INSERT-only, RLS pro Mandant
- JSONB-Events mit full Payload-Hash, actor_id, timestamp (nanosecond precision), IP
- Exportierbar als CSV für DSGVO-Auskunft und Gerichts-Nachweis
- Nie in UI außer für Admin-Audit-View

### Sicht 2: Human-Narrative (NEU)
- Derived View, On-the-Fly generiert aus audit_trail
- Natürliche Sprache, chronologisch, gruppiert nach Event-Cluster
- Direkt im Auftrags-Detail-Screen sichtbar (eigener Tab "Historie")

Beide zeigen dieselbe Wahrheit. Sicht 1 ist für Gericht/DSGVO-Anfrage, Sicht 2 ist für SV/Alltag.

---

## Event-Taxonomie (5 Kategorien, angelehnt an Notion)

Von Cluster-4-Quelle 17 (Notion Audit Log): 5 Event-Kategorien mit 40+ Subtypen. Adaptiert für PROVA:

| Kategorie | Event-Typen (Auswahl) | Beispiel-Narrative |
|---|---|---|
| **A. Auftrag** | erstellt, status_geändert, freigegeben, reopened, versendet | "Marcel hat den Auftrag *XY-2025-034* erstellt" |
| **B. Befund** | foto_hinzugefügt, diktat_transkribiert, befund_editiert, fragment_erstellt | "12 Befund-Fragmente aus Diktat *aussen-west.m4a* extrahiert" |
| **C. KI** | vorschlag_gemacht, vorschlag_akzeptiert, vorschlag_abgelehnt, zitat_vorgeschlagen | "KI-Assistent hat 3 Formulierungs-Vorschläge zu Absatz 5 gemacht — 2 akzeptiert, 1 abgelehnt" |
| **D. Export/Versand** | pdf_exportiert, als_email_versendet, zertifikat_erstellt, nachgeladen | "Gutachten als PDF exportiert (SHA256: a3f2...), Zertifikat beigefügt" |
| **E. Zugriff** | login, page_geöffnet, freigabe_erteilt, geteilt_mit | "Anna Meier hat den Auftrag geöffnet (Leserecht)" |

---

## Wie der Human-Narrative generiert wird (technisch)

**NICHT** ein zweiter Write in eine zweite Tabelle. Sondern: **Read-Only View** auf audit_trail mit Template-Mapping.

```
audit_trail (JSON) → Narrative-Template-Engine → Menschlesbarer Text
```

Template-Engine ist trivial (String-Substitution in Edge Function). Konkrete Mappings werden als TypeScript/JS-Modul versioniert (keine DB-Column mit Text).

**Warum so?** Falls wir Templates später anpassen (z.B. bessere Übersetzung "foto_hinzugefügt" → "Sie haben ein Foto hochgeladen"), müssen wir NICHT Millionen von Events neu schreiben. Das ist reine Presentation Layer.

**Beispiel-Mapping:**
```
Event: { type: "ki.vorschlag_akzeptiert", actor: "sv_marcel", data: {...} }
Template: "KI-Assistent → {actor_pretty} hat einen {suggestion_type}-Vorschlag 
           in {section} übernommen ({similarity}% Übereinstimmung mit Original)"
Output: "KI-Assistent → Marcel hat einen Formulierungs-Vorschlag in §6.2 
         übernommen (87% Übereinstimmung mit Original)"
```

---

## UI-Skizze der Human-Narrative (Detailed in Teil D)

Tab "Historie" im Auftrags-Detail. Jeder Tag eine Gruppe. Jede Gruppe ist eine kleine Timeline mit Icon + Text + Zeit + Actor-Avatar.

```
Heute, 12. Mai 2026
─────────────────────────
🟢  15:32  Marcel  — Gutachten als PDF exportiert
📎  15:31  Marcel  — Anhang "messprotokoll.pdf" hinzugefügt
🤖  14:18  KI       — 3 Formulierungs-Vorschläge in §6.2 
                      (2 akzeptiert, 1 abgelehnt)
📸  13:45  Marcel  — 8 Fotos hochgeladen aus "Westfassade.zip"
🎙️  13:44  Marcel  — Diktat "westseite.m4a" transkribiert (4:32 Min)

Gestern, 11. Mai 2026
─────────────────────────
🔧  17:02  Marcel  — Status auf "In Bearbeitung" geändert
...
```

Filter oben: "Alles" / "Nur KI" / "Nur Dokumente" / "Nur Status".
Date-Picker. Volltext-Suche (über den generierten Narrative-Text).

---

## Sonderfall: KI-Cluster

KI-Events neigen dazu, *viele* zu werden (pro Vorschlag eins). Daher: **Cluster-UI** bei KI.

Beispiel: Der SV arbeitet 10 Minuten im Editor, bekommt 47 Vorschläge, akzeptiert 23, ändert 15, lehnt 9 ab.

Schlechte UI: 47 einzelne Einträge.
Gute UI: **Ein Cluster-Eintrag**, aufklappbar:

```
🤖  14:15–14:25  Editor-Session §6 Fachurteil
    47 KI-Aktionen ·  23 ✓ akzeptiert · 15 ✎ bearbeitet · 9 ✗ abgelehnt
    [▼ Details anzeigen]
```

Beim Aufklappen: Tabelle mit jeder Einzelaktion. Genau das, was das Gericht wissen will — aber nicht in der Haupt-Timeline.

---

## Export-Varianten (für Anwalt/Gericht)

Drei Export-Modi:

1. **Kompakt (1 Seite, mit-gePDFt als "Zertifikat")** — aggregierte Statistik:
   - Erstellungs­zeitraum: 02.04.2025 – 12.05.2025
   - KI-Beteiligungsumfang: 34% der Sätze hatten KI-Vorschläge in irgendeiner Form
   - 0 Absätze wurden von KI generiert und ungeprüft übernommen
   - SV-Signatur-Hash: a3f2...
   - Dokument-SHA256: b7e9...

2. **Detail-PDF (20-200 Seiten, auf Anfrage)** — chronologisch, Human-Narrative, Filter optional

3. **Forensik-CSV (für Gericht)** — technischer Raw-Log, alle Felder, unverändert

---

## Was SV sehen soll (Default-UI)

In der Sidebar des Auftrags: Mini-Statistik permanent sichtbar:

```
┌────────────────────────────────┐
│  Historie                       │
│  47 Ereignisse · zuletzt 15:32  │
│  🤖 12 KI-Aktionen              │
│  📸 8 Fotos · 🎙️ 3 Diktate      │
│                    [Alle zeigen]│
└────────────────────────────────┘
```

Bei Klick → volle Historie öffnet. Nicht aufdringlich, aber immer präsent.

---

## Der wichtigste Satz in diesem Thema

Der Audit-Trail ist **nicht** "Compliance-Ballast". Er ist das **Alleinstellungs­merkmal** gegenüber Word/Excel-SV-Workflows.

Kein SV, der heute mit Word arbeitet, kann rekonstruieren, an welcher Satz-Stelle er ein Template kopiert hat. Du kannst.

Das wirkt als Backstop gegen Darmstadt-2.0 — und als Marketing-Asset.

---

## Implementierungs-Checkliste (referenziert in Teil F)

1. Bestehendes `audit_trail` behalten, INSERT-only bestätigen, RLS prüfen
2. Neuer Event-Type für KI-Aktionen: `ki_protokoll`-Einträge → ebenso audit_trail-Pflicht (double-write)
3. TypeScript-Mapping-Modul `audit-narrative.ts` (Templates pro Event-Type)
4. Edge Function `audit-narrative-v1`: nimmt auftrag_id, gibt narrated events zurück
5. UI: Tab "Historie" im Auftrag-Detail-Screen
6. UI: Sidebar-Widget "Historie" (Mini-Stats)
7. Export-Mode "Kompakt-Zertifikat" (1 PDF-Seite)
8. Export-Mode "Detail" (vollständige narrated history als PDF)
9. Export-Mode "Forensik-CSV" (raw dump für Gerichts-Anfrage)

Alle Items sind S (≤ 2 Tage) außer #4 und #7 (M).
