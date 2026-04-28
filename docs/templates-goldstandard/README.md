# PROVA Templates Goldstandard

**Stand:** 28.04.2026  
**Total:** 35 Templates (23 bestehend + 12 neue Bescheinigungen)

---

## ✅ Status-Tabelle

### 04-Gutachten (23 bestehend - PRIORITÄT 1)

| Template | UUID | Status |
|----------|------|--------|
| F-04 KURZSTELLUNGNAHME | C4BB257B-... | ✅ DONE (Goldstandard) |
| F-09 KURZGUTACHTEN | BA076019-... | ☐ Marcel exportiert |
| F-10 BEWEISSICHERUNG | 6FF656D3-... | ☐ Marcel exportiert |
| F-11 BRANDSCHADEN | 6B85ECFF-... | ☐ Marcel exportiert |
| F-12 FEUCHTE-SCHIMMEL | 4233F240-... | ☐ Marcel exportiert |
| F-13 ELEMENTARSCHADEN | 8868A0E2-... | ☐ Marcel exportiert |
| F-14 BAUMAENGEL | 3174576E-... | ☐ Marcel exportiert |
| F-15 GERICHTSGUTACHTEN | 36E140DC-... | ☐ Marcel exportiert |
| F-16 ERGAENZUNG | A8D05FAB-... | ☐ Marcel exportiert |
| F-17 SCHIEDSGUTACHTEN | 37CF6A57-... | ☐ Marcel exportiert |
| F-18 BAUABNAHME | 4D81616B-... | ☐ Marcel exportiert |
| F-19 WERTGUTACHTEN | 29064D98-... | ☐ Marcel exportiert |

### 01-Rechnungen
| F-01 JVEG GERICHTSRECHNUNG | S32BEA1F-... | ☐ Marcel |
| F-02 PAUSCHALRECHNUNG | 81C3E69D-... | ☐ Marcel |
| F-03 STUNDENRECHNUNG | EA5CAC85-... | ☐ Marcel |
| F-05 GUTSCHRIFT-STORNO | 64BFD7F0-... | ☐ Marcel |

### 02-Bestätigungen
| PROVA-BRIEF | BAD1170B-... | ☐ Marcel |
| FOTODOKU | 0383BD85-... | ☐ Marcel |

### 03-Mahnungen
| F-06 MAHNUNG-1 | 8ECAC2E4-... | ☐ Marcel |
| F-07 MAHNUNG-2 | A4E57F73-... | ☐ Marcel |
| F-08 MAHNUNG-3-LETZTE | 6ADE8D9A-... | ☐ Marcel |

### 05-Sonstige
| PROVA-GUTACHTEN-SOLO | EC64C790-... | ☐ Marcel |
| PROVA-GUTACHTEN-TEAM | E865E0CD-... | ☐ Marcel |

### 06-Bescheinigungen-NEU (12 NEU - Claude designt)

| Template | Beschreibung | Status |
|----------|--------------|--------|
| BES-01 SV-BESTAETIGUNG | Genereller SV-Nachweis | ⏳ Claude |
| BES-02 ORTSBESICHTIGUNG | Ortsbesichtigungs-Bestätigung | ⏳ Claude |
| BES-03 AUFTRAGSANNAHME | Auftragsannahme-Bestätigung | ⏳ Claude |
| BES-04 TERMIN-BESTAETIGUNG | Termin-Bestätigung | ⏳ Claude |
| BES-05 MAENGELFREIHEIT | Mängelfreiheits-Bescheinigung | ⏳ Claude |
| BES-06 ZUSTAND | Zustands-Bescheinigung | ⏳ Claude |
| BES-07 BEWEISSICHERUNG-BEST | Beweissicherungs-Bestätigung | ⏳ Claude |
| BES-08 SCHIMMELFREIHEIT | Schimmelfreiheits-Bescheinigung | ⏳ Claude |
| BES-09 FEUCHTIGKEIT | Feuchtigkeits-Bescheinigung | ⏳ Claude |
| BES-10 STANDSICHERHEIT | Standsicherheits-Bestätigung | ⏳ Claude |
| BES-11 BEDENKEN-VOB-S4 | Bedenken-Anzeige nach §4 VOB/B | ⏳ Claude |
| BES-12 BEHINDERUNG-VOB-S6 | Behinderungs-Anzeige nach §6 VOB/B | ⏳ Claude |

---

## 🤝 Aufgabenteilung

### 🟢 Marcel (PARALLEL):
- 23 bestehende Templates aus PDFMonkey exportieren
- Pro Template: HTML kopieren → in entsprechendem File ersetzen
- JSON-Sample-Data → in entsprechendem File ersetzen
- ZIP am Ende erstellen

### 🔵 Claude (im Chat hier):
- 12 Bescheinigungs-Templates designen (HTML+JSON)
- Pattern aus F-04-KURZSTELLUNGNAHME nutzen
- IHK-konform + Design-System v1.0
- DSGVO/§ 407a/EU AI Act Boxen integriert

---

## 🎯 Reihenfolge für Marcel (Export aus PDFMonkey)

**Phase 1 — Pilot-kritisch (~30 Min):**
1. F-09 KURZGUTACHTEN
2. F-10 BEWEISSICHERUNG  
3. F-15 GERICHTSGUTACHTEN
4. PROVA-BRIEF
5. F-02 PAUSCHALRECHNUNG
6. F-19 WERTGUTACHTEN

**Phase 2 — Erweitert (~20 Min):**
7. F-11-F-14 (Spezial-Schäden)
8. F-17 SCHIEDSGUTACHTEN
9. F-16 ERGAENZUNG
10. F-18 BAUABNAHME

**Phase 3 — Service (~15 Min):**
11. F-01 JVEG, F-03 STUNDEN, F-05 GUTSCHRIFT
12. F-06-F-08 MAHNUNGEN
13. FOTODOKU, PROVA-GUTACHTEN-SOLO, -TEAM

---

## 📦 ZIP am Ende

\\\powershell
cd C:\PROVA-Systems\prova-systems\GitHub\prova-systems
Compress-Archive -Path "docs/templates-goldstandard/*" -DestinationPath "docs/templates-goldstandard-FULL.zip" -Force
\\\

→ ZIP zu Claude im nächsten Chat
