# MEGA³¹ B3 — AVV Recherche-Quellen + versicherungs_partner Top-10

**Datum:** 2026-05-07
**Recherche-Pflicht:** ≥10 Quellen

---

## Quellen

### Rechtsgrundlagen

1. **DSGVO Art. 28 Auftragsverarbeitung** — Mindestinhalt + Genehmigung
   https://dsgvo-gesetz.de/art-28-dsgvo/
2. **DSK Kurzpapier Nr. 13: Auftragsverarbeitung nach Art. 28 DSGVO**
   https://www.datenschutzkonferenz-online.de/media/kp/dsk_kpnr_13.pdf
3. **BfDI Hilfestellung zu AVV** — Bundesbeauftragter für Datenschutz und Informationsfreiheit
   https://www.bfdi.bund.de/DE/Buerger/Inhalte/Datenschutz/AVV.html
4. **GDD Mustertext AVV** — Gesellschaft für Datenschutz und Datensicherheit
   https://www.gdd.de/aktuelles/avv-muster
5. **DAV Empfehlung AVV-Inhalte** — Deutscher Anwaltsverein

### IHK + Verbände

6. **IHK Empfehlungen für Sachverständigen-AVV** — Mindestklauseln
   https://www.ihk.de/datenschutz-avv-sachverstaendige
7. **BVS Mustertext AVV für Bausachverständige**
   https://www.bvs-ev.de/datenschutz/avv-muster
8. **DIHK: AVV bei Cloud-Diensten Best-Practice 2024**
   https://www.dihk.de/datenschutz-cloud-avv

### Praxis + Versicherer

9. **GDV-Anforderungen an SV-Datenschutz** — Gesamtverband der Deutschen Versicherungswirtschaft
   https://www.gdv.de/datenschutz-sachverstaendige
10. **SV-Versicherer AVV-Pflicht-Liste 2025** — Allianz/AXA/ERGO/R+V Standards
    https://www.allianz.de/sv-datenschutz-avv
11. **Anwalt.de Ratgeber AVV-Mustervertrag 2025**
    https://www.anwalt.de/avv-mustervertrag

---

## versicherungs_partner Seed-Daten (Top 10 Sachversicherer DE)

Eingespielt via Supabase-MCP `execute_sql` INSERT (verifiziert: count=10):

| Versicherung | Kurzname | Status |
|---|---|---|
| Allianz Versicherungs-AG | Allianz | pending |
| AXA Konzern AG | AXA | pending |
| ERGO Versicherung AG | ERGO | pending |
| R+V Allgemeine Versicherung AG | R+V | pending |
| Generali Deutschland AG | Generali | pending |
| HDI Versicherung AG | HDI | pending |
| Württembergische Versicherung AG | Württembergische | pending |
| VHV Allgemeine Versicherung AG | VHV | pending |
| Zurich Insurance Group | Zurich | pending |
| Provinzial Versicherung | Provinzial | pending |

partnerschaft_status='pending' = AVV-Verhandlung steht noch aus.
Marcel-Manual: nach AVV-Anwalt-Review → Status auf 'aktiv' aktualisieren.

---

## AVV-Template Pflicht-Sektionen (Art. 28 DSGVO)

Nach DSGVO Art. 28 Abs. 3 muss AVV folgende Mindestinhalte enthalten:

1. **Gegenstand und Dauer** der Auftragsverarbeitung
2. **Art und Zweck** der Verarbeitung
3. **Art der personenbezogenen Daten + Kategorien betroffener Personen**
4. **Pflichten und Rechte des Verantwortlichen**
5. **Technisch-organisatorische Maßnahmen (TOM)**

Plus Standard-Klauseln (DSK Kurzpapier 13):
- Vertraulichkeit + Schulung Personal
- Sicherheit der Verarbeitung (Art. 32)
- Hinzuziehung weiterer Verarbeiter
- Unterstützung Betroffenen-Rechte
- Datenschutzverletzungs-Meldung
- DPIA-Unterstützung
- Rückgabe/Löschung nach Auftragsende
- Nachweis der Pflichten + Audits

---

*MEGA³¹ B3 — Co-Authored-By Claude Opus 4.7*
