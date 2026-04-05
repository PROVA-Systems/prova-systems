/* ════════════════════════════════════════════════════════════
   PROVA kostenermittlung-logic.js
   Kostenermittlung — Kalkulation, JVEG, Positionen
   Extrahiert aus kostenermittlung.html
════════════════════════════════════════════════════════════ */

/* ============================================================
   POSITIONSDATENBANK — 303 Positionen, lokal eingebettet
   Preisbasis: BKI Baukosten / Sirados 2024, netto
============================================================ */
const POSITIONEN = [
  // WASSERSCHADEN
  {id:'WS-001',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Trocknungsgerät Kondensationstrockner Aufstellung und Betrieb je Tag',ei:'Stk',mn:18,me:28,mx:42,nr:'VdS 3151'},
  {id:'WS-002',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Trocknungsgerät Großgerät (Baukondensator) je Tag',ei:'Stk',mn:45,me:65,mx:95,nr:'VdS 3151'},
  {id:'WS-003',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Luftentfeuchter Kleingerät bis 20 l/Tag je Tag',ei:'Stk',mn:12,me:18,mx:28,nr:'VdS 3151'},
  {id:'WS-004',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Infrarot-Flächenheizung Wandtrocknung je Tag',ei:'Stk',mn:35,me:52,mx:78,nr:'VdS 3151'},
  {id:'WS-005',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Mikrowellen-Trocknungsgerät Estrich/Wand je Tag',ei:'Stk',mn:55,me:85,mx:130,nr:'VdS 3151'},
  {id:'WS-006',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Injektionstrocknung Horizontalsperre nachträglich je lfm',ei:'lfm',mn:28,me:42,mx:68,nr:'DIN 18533'},
  {id:'WS-007',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Warmluftgebläse Bauteiltrocknung je Tag',ei:'Stk',mn:22,me:35,mx:55,nr:'VdS 3151'},
  {id:'WS-008',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Feuchtemesskampagne Aufnahme und Protokoll',ei:'Psch',mn:120,me:185,mx:280,nr:''},
  {id:'WS-009',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Trocknungsbegleitung und Dokumentation je Begehung',ei:'Psch',mn:95,me:145,mx:220,nr:'VdS 3151'},
  {id:'WS-010',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Lüftungsgerät Zuluft/Abluft Bauteiltrocknung je Tag',ei:'Stk',mn:25,me:38,mx:58,nr:''},
  {id:'WS-011',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Trocknungsprotokoll komplett inkl. Messberichte',ei:'Psch',mn:150,me:225,mx:380,nr:'VdS 3151'},
  {id:'WS-012',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Kernbohrung Trocknungskanal Estrich je Bohrung',ei:'Stk',mn:18,me:26,mx:42,nr:'DIN 18353'},
  {id:'WS-013',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Estrichrandschlitz für Trocknungsschläuche je lfm',ei:'lfm',mn:8,me:13,mx:22,nr:'DIN 18353'},
  {id:'WS-014',sa:'WS',kat:'Wasserschaden',uk:'Trocknung',bez:'Restfeuchtemessung Dielenboden Protokoll je Fläche',ei:'Psch',mn:85,me:130,mx:195,nr:''},
  {id:'WS-015',sa:'WS',kat:'Wasserschaden',uk:'Estrichöffnung',bez:'Estrich aufbrechen und entsorgen Zementestrich bis 60mm je m²',ei:'m²',mn:28,me:42,mx:68,nr:'DIN 18353'},
  {id:'WS-016',sa:'WS',kat:'Wasserschaden',uk:'Estrichöffnung',bez:'Estrich aufbrechen und entsorgen Anhydritestrich bis 50mm je m²',ei:'m²',mn:25,me:38,mx:62,nr:'DIN 18353'},
  {id:'WS-017',sa:'WS',kat:'Wasserschaden',uk:'Estrichöffnung',bez:'Estrich aufbrechen Teilfläche bis 5 m² Mindermengenzuschlag',ei:'Psch',mn:180,me:265,mx:420,nr:'DIN 18353'},
  {id:'WS-018',sa:'WS',kat:'Wasserschaden',uk:'Estrichöffnung',bez:'Schwimmender Estrich komplett entfernen inkl. Dämmung je m²',ei:'m²',mn:35,me:52,mx:82,nr:'DIN 18353'},
  {id:'WS-019',sa:'WS',kat:'Wasserschaden',uk:'Estrichöffnung',bez:'Fußbodenheizungsestrich öffnen Trocknungsfenster je Stk',ei:'Stk',mn:45,me:68,mx:105,nr:'DIN 18353'},
  {id:'WS-020',sa:'WS',kat:'Wasserschaden',uk:'Estrichöffnung',bez:'Estrich neu einbringen Zement C25 je m²',ei:'m²',mn:32,me:48,mx:76,nr:'DIN 18353'},
  {id:'WS-021',sa:'WS',kat:'Wasserschaden',uk:'Estrichöffnung',bez:'Estrich Anhydrit Reparatur je m²',ei:'m²',mn:28,me:43,mx:68,nr:'DIN 18353'},
  {id:'WS-022',sa:'WS',kat:'Wasserschaden',uk:'Estrichöffnung',bez:'Dehnfuge Estrich einschneiden und neu verfüllen je lfm',ei:'lfm',mn:12,me:18,mx:28,nr:'DIN 18353'},
  {id:'WS-023',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Wasserleitung Kupfer DN 15 Unterputz erneuern je lfm',ei:'lfm',mn:48,me:72,mx:115,nr:'DIN EN 1057'},
  {id:'WS-024',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Wasserleitung Kunststoff PE-X DN 20 UP erneuern je lfm',ei:'lfm',mn:38,me:56,mx:88,nr:''},
  {id:'WS-025',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Heizungsrohr Stahl DN 20 UP erneuern je lfm',ei:'lfm',mn:52,me:78,mx:125,nr:'DIN EN 10255'},
  {id:'WS-026',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Abwasserleitung HT-Rohr DN 50 erneuern je lfm',ei:'lfm',mn:42,me:65,mx:105,nr:'DIN EN 1329'},
  {id:'WS-027',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Abwasserleitung HT-Rohr DN 100 erneuern je lfm',ei:'lfm',mn:55,me:85,mx:135,nr:'DIN EN 1329'},
  {id:'WS-028',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Rohrmanschette Leckstelle reparieren Kupfer',ei:'Stk',mn:45,me:68,mx:108,nr:''},
  {id:'WS-029',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Leitungsschlitz aufstämmen Mauerwerk je lfm',ei:'lfm',mn:22,me:34,mx:55,nr:''},
  {id:'WS-030',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Leitungsschlitz schließen verputzen je lfm',ei:'lfm',mn:18,me:27,mx:43,nr:''},
  {id:'WS-031',sa:'WS',kat:'Wasserschaden',uk:'Leitungserneuerung',bez:'Kugelhahn Absperrarmatur DN 25 tauschen',ei:'Stk',mn:85,me:128,mx:205,nr:''},
  {id:'WS-032',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'Fliesen und Fliesenbelag inkl. Klebemörtel entfernen je m²',ei:'m²',mn:18,me:27,mx:43,nr:'DIN 18157'},
  {id:'WS-033',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'Parkettboden Diele entfernen und entsorgen je m²',ei:'m²',mn:15,me:23,mx:38,nr:''},
  {id:'WS-034',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'Laminatboden entfernen und entsorgen je m²',ei:'m²',mn:8,me:13,mx:22,nr:''},
  {id:'WS-035',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'PVC-Belag/Vinylboden entfernen je m²',ei:'m²',mn:10,me:16,mx:26,nr:''},
  {id:'WS-036',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'Teppichboden entfernen und entsorgen je m²',ei:'m²',mn:6,me:9,mx:15,nr:''},
  {id:'WS-037',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'Fliesen neu verlegen Standardfliese bis 30x30cm je m²',ei:'m²',mn:45,me:68,mx:105,nr:'DIN 18157'},
  {id:'WS-038',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'Fliesen neu verlegen Großformat ab 60x60cm je m²',ei:'m²',mn:65,me:98,mx:155,nr:'DIN 18157'},
  {id:'WS-039',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'Parkettboden Stabparkett neu verlegen je m²',ei:'m²',mn:52,me:78,mx:125,nr:''},
  {id:'WS-040',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'Laminatboden neu verlegen mit Trittschalldämmung je m²',ei:'m²',mn:28,me:42,mx:68,nr:''},
  {id:'WS-041',sa:'WS',kat:'Wasserschaden',uk:'Bodenbeläge',bez:'PVC-Designbelag neu verlegen je m²',ei:'m²',mn:32,me:48,mx:76,nr:''},
  {id:'WS-042',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Putz Unterputz Kalkzementputz abtragen je m²',ei:'m²',mn:15,me:23,mx:38,nr:'DIN 18550'},
  {id:'WS-043',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Putz Innenputz neu aufbringen Kalkgipsputz je m²',ei:'m²',mn:22,me:33,mx:52,nr:'DIN 18550'},
  {id:'WS-044',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Sanierputz Feuchtigkeitsschutz aufbringen je m²',ei:'m²',mn:28,me:43,mx:68,nr:'WTA 2-9-04/D'},
  {id:'WS-045',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Mauerwerk Injektionsmittel Horizontalsperre je lfm',ei:'lfm',mn:32,me:48,mx:78,nr:'DIN 18533'},
  {id:'WS-046',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Tapete entfernen einfachlagig je m²',ei:'m²',mn:4,me:6,mx:10,nr:''},
  {id:'WS-047',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Tapezieren neu Raufasertapete je m²',ei:'m²',mn:8,me:12,mx:19,nr:''},
  {id:'WS-048',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Anstrich Dispersionsfarbe 2-fach je m²',ei:'m²',mn:5,me:8,mx:13,nr:''},
  {id:'WS-049',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Gipskartonwand nass erneuern komplett je m²',ei:'m²',mn:45,me:68,mx:108,nr:'DIN 18180'},
  {id:'WS-050',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Fliesen Wandfliesen entfernen je m²',ei:'m²',mn:16,me:25,mx:40,nr:'DIN 18157'},
  {id:'WS-051',sa:'WS',kat:'Wasserschaden',uk:'Wände',bez:'Fliesen Wandfliesen neu verlegen je m²',ei:'m²',mn:48,me:72,mx:115,nr:'DIN 18157'},
  {id:'WS-052',sa:'WS',kat:'Wasserschaden',uk:'Decken',bez:'Gipskartondecke abbauen und entsorgen je m²',ei:'m²',mn:18,me:27,mx:43,nr:'DIN 18180'},
  {id:'WS-053',sa:'WS',kat:'Wasserschaden',uk:'Decken',bez:'Gipskartondecke neu einbauen je m²',ei:'m²',mn:42,me:65,mx:105,nr:'DIN 18180'},
  {id:'WS-054',sa:'WS',kat:'Wasserschaden',uk:'Decken',bez:'Deckenputz abschlagen je m²',ei:'m²',mn:14,me:21,mx:34,nr:''},
  {id:'WS-055',sa:'WS',kat:'Wasserschaden',uk:'Decken',bez:'Deckenputz neu aufbringen Kalkgips je m²',ei:'m²',mn:20,me:30,mx:48,nr:'DIN 18550'},
  {id:'WS-056',sa:'WS',kat:'Wasserschaden',uk:'Sanitär',bez:'Waschtisch demontieren und entsorgen',ei:'Stk',mn:65,me:98,mx:155,nr:''},
  {id:'WS-057',sa:'WS',kat:'Wasserschaden',uk:'Sanitär',bez:'WC-Komplettanlage demontieren und entsorgen',ei:'Stk',mn:85,me:128,mx:205,nr:''},
  {id:'WS-058',sa:'WS',kat:'Wasserschaden',uk:'Sanitär',bez:'Badewanne demontieren und entsorgen',ei:'Stk',mn:95,me:145,mx:230,nr:''},
  {id:'WS-059',sa:'WS',kat:'Wasserschaden',uk:'Sanitär',bez:'Dusche bodengleich inkl. Ablauf neu herstellen',ei:'Stk',mn:650,me:980,mx:1550,nr:'DIN 18534'},
  {id:'WS-060',sa:'WS',kat:'Wasserschaden',uk:'Elektro',bez:'Steckdose Unterputz nass demontieren und neu installieren',ei:'Stk',mn:45,me:68,mx:108,nr:'DIN VDE 0100'},
  {id:'WS-061',sa:'WS',kat:'Wasserschaden',uk:'Elektro',bez:'E-Prüfung nach Wasserschaden VDE-Protokoll',ei:'Psch',mn:185,me:280,mx:445,nr:'DIN VDE 0100'},
  {id:'WS-062',sa:'WS',kat:'Wasserschaden',uk:'Elektro',bez:'Elektroleitungen UP erneuern je lfm',ei:'lfm',mn:18,me:27,mx:43,nr:'DIN VDE 0100'},
  {id:'WS-063',sa:'WS',kat:'Wasserschaden',uk:'Demontage',bez:'Sockelleisten entfernen je lfm',ei:'lfm',mn:4,me:6,mx:10,nr:''},
  {id:'WS-064',sa:'WS',kat:'Wasserschaden',uk:'Demontage',bez:'Entsorgung Bauschutt bis 2m³ Container',ei:'Psch',mn:185,me:280,mx:445,nr:''},
  {id:'WS-065',sa:'WS',kat:'Wasserschaden',uk:'Demontage',bez:'Geruchsneutralisation nach Nässeschaden je m²',ei:'m²',mn:6,me:9,mx:15,nr:''},
  {id:'WS-066',sa:'WS',kat:'Wasserschaden',uk:'Demontage',bez:'Bautrocknung Abschlussbericht Feuchteatlas',ei:'Psch',mn:220,me:340,mx:540,nr:'VdS 3151'},
  // BRANDSCHADEN
  {id:'BS-001',sa:'BS',kat:'Brandschaden',uk:'Rußreinigung',bez:'Rußreinigung Wände trocken Schwamm je m²',ei:'m²',mn:8,me:13,mx:22,nr:''},
  {id:'BS-002',sa:'BS',kat:'Brandschaden',uk:'Rußreinigung',bez:'Rußreinigung Decken trocken Schwamm je m²',ei:'m²',mn:10,me:15,mx:25,nr:''},
  {id:'BS-003',sa:'BS',kat:'Brandschaden',uk:'Rußreinigung',bez:'Rußreinigung nass chemisch Wände je m²',ei:'m²',mn:12,me:18,mx:30,nr:''},
  {id:'BS-004',sa:'BS',kat:'Brandschaden',uk:'Rußreinigung',bez:'Rußreinigung Holzbalken Dachstuhl je m²',ei:'m²',mn:15,me:23,mx:38,nr:''},
  {id:'BS-005',sa:'BS',kat:'Brandschaden',uk:'Rußreinigung',bez:'Hochdruckreinigung brandbeschädigte Flächen je m²',ei:'m²',mn:6,me:9,mx:15,nr:''},
  {id:'BS-006',sa:'BS',kat:'Brandschaden',uk:'Rußreinigung',bez:'Industriesauger Feinstaub Feinreinigung je h',ei:'h',mn:65,me:95,mx:145,nr:''},
  {id:'BS-007',sa:'BS',kat:'Brandschaden',uk:'Rußreinigung',bez:'Rußreinigung Heizungsanlage Kessel und Rohre',ei:'Psch',mn:285,me:435,mx:695,nr:''},
  {id:'BS-008',sa:'BS',kat:'Brandschaden',uk:'Rußreinigung',bez:'Lüftungsanlage Brandgase reinigen komplett',ei:'Psch',mn:450,me:685,mx:1095,nr:''},
  {id:'BS-009',sa:'BS',kat:'Brandschaden',uk:'Geruchsneutralisation',bez:'Ozonbehandlung je m³ Raumvolumen',ei:'m³',mn:1,me:2,mx:3,nr:''},
  {id:'BS-010',sa:'BS',kat:'Brandschaden',uk:'Geruchsneutralisation',bez:'Hydroxyl-Generator Betrieb je Tag',ei:'Stk',mn:65,me:98,mx:155,nr:''},
  {id:'BS-011',sa:'BS',kat:'Brandschaden',uk:'Geruchsneutralisation',bez:'Einschlusslackierung Geruchssperrschicht je m²',ei:'m²',mn:8,me:13,mx:22,nr:''},
  {id:'BS-012',sa:'BS',kat:'Brandschaden',uk:'Demontage',bez:'Brandschutt entfernen und entsorgen bis 5m³',ei:'Psch',mn:380,me:580,mx:925,nr:'AVV'},
  {id:'BS-013',sa:'BS',kat:'Brandschaden',uk:'Demontage',bez:'Brandschutt Sonderabfall kontaminiert Entsorgungsnachweis',ei:'Psch',mn:580,me:885,mx:1415,nr:'AVV'},
  {id:'BS-014',sa:'BS',kat:'Brandschaden',uk:'Demontage',bez:'Dachstuhl brandgeschädigt Teilabbruch je m²',ei:'m²',mn:35,me:52,mx:85,nr:'DIN 18338'},
  {id:'BS-015',sa:'BS',kat:'Brandschaden',uk:'Demontage',bez:'Dachstuhl komplett abreißen je m²',ei:'m²',mn:55,me:85,mx:135,nr:'DIN 18338'},
  {id:'BS-016',sa:'BS',kat:'Brandschaden',uk:'Demontage',bez:'Gipskartonwände brandbeschädigt entfernen je m²',ei:'m²',mn:18,me:27,mx:43,nr:'DIN 18180'},
  {id:'BS-017',sa:'BS',kat:'Brandschaden',uk:'Demontage',bez:'Fenster brandbeschädigt ausbauen je Stk',ei:'Stk',mn:85,me:130,mx:210,nr:''},
  {id:'BS-018',sa:'BS',kat:'Brandschaden',uk:'Wiederherstellung Wände',bez:'Wände nach Brand neu verputzen Kalkzement je m²',ei:'m²',mn:22,me:34,mx:55,nr:'DIN 18550'},
  {id:'BS-019',sa:'BS',kat:'Brandschaden',uk:'Wiederherstellung Wände',bez:'Gipskartonwand nach Brand neu erstellen je m²',ei:'m²',mn:45,me:68,mx:108,nr:'DIN 18180'},
  {id:'BS-020',sa:'BS',kat:'Brandschaden',uk:'Wiederherstellung Wände',bez:'Brandschutzwand F90 neu erstellen je m²',ei:'m²',mn:85,me:130,mx:210,nr:'DIN 4102-4'},
  {id:'BS-021',sa:'BS',kat:'Brandschaden',uk:'Wiederherstellung Decken',bez:'Deckenputz erneuern nach Brand je m²',ei:'m²',mn:20,me:30,mx:48,nr:'DIN 18550'},
  {id:'BS-022',sa:'BS',kat:'Brandschaden',uk:'Wiederherstellung Decken',bez:'Gipskartondecke neu erstellen nach Brand je m²',ei:'m²',mn:42,me:65,mx:105,nr:'DIN 18180'},
  {id:'BS-023',sa:'BS',kat:'Brandschaden',uk:'Wiederherstellung Böden',bez:'Estrich nach Brand neu einbringen Zementestrich je m²',ei:'m²',mn:32,me:48,mx:78,nr:'DIN 18353'},
  {id:'BS-024',sa:'BS',kat:'Brandschaden',uk:'Wiederherstellung Böden',bez:'Fliesen nach Brand neu verlegen je m²',ei:'m²',mn:48,me:72,mx:115,nr:'DIN 18157'},
  {id:'BS-025',sa:'BS',kat:'Brandschaden',uk:'Wiederherstellung Böden',bez:'Parkettboden nach Brand neu verlegen je m²',ei:'m²',mn:55,me:85,mx:135,nr:''},
  {id:'BS-026',sa:'BS',kat:'Brandschaden',uk:'Elektro',bez:'Elektroinstallation Wohnung komplett erneuern je m²',ei:'m²',mn:55,me:85,mx:135,nr:'DIN VDE 0100'},
  {id:'BS-027',sa:'BS',kat:'Brandschaden',uk:'Elektro',bez:'Unterverteilung Sicherungskasten neu liefern und montieren',ei:'Stk',mn:385,me:590,mx:945,nr:'DIN VDE 0100'},
  {id:'BS-028',sa:'BS',kat:'Brandschaden',uk:'Elektro',bez:'Rauchmelder nach Brand tauschen je Stk',ei:'Stk',mn:28,me:42,mx:68,nr:'DIN EN 14604'},
  {id:'BS-029',sa:'BS',kat:'Brandschaden',uk:'Dach',bez:'Dacheindeckung Dachziegel brandbeschädigt erneuern je m²',ei:'m²',mn:55,me:85,mx:135,nr:'DIN 18338'},
  {id:'BS-030',sa:'BS',kat:'Brandschaden',uk:'Dach',bez:'Dachstuhl Holzkonstruktion Teilsanierung je m²',ei:'m²',mn:95,me:145,mx:230,nr:'DIN 68800'},
  {id:'BS-031',sa:'BS',kat:'Brandschaden',uk:'Dach',bez:'Dachstuhl Neubau Vollholz je m²',ei:'m²',mn:125,me:190,mx:305,nr:'DIN 68800'},
  {id:'BS-032',sa:'BS',kat:'Brandschaden',uk:'Dach',bez:'Dachdämmung erneuern Mineralwolle je m²',ei:'m²',mn:32,me:48,mx:78,nr:''},
  {id:'BS-033',sa:'BS',kat:'Brandschaden',uk:'Dach',bez:'Dachfenster nach Brand erneuern je Stk',ei:'Stk',mn:385,me:590,mx:945,nr:''},
  {id:'BS-034',sa:'BS',kat:'Brandschaden',uk:'Dach',bez:'Notabdichtung Dach Folienplane je m²',ei:'m²',mn:8,me:13,mx:22,nr:''},
  // STURMSCHADEN
  {id:'SS-001',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Dachziegel Tonziegel Einzelstück tauschen je Stk',ei:'Stk',mn:18,me:27,mx:43,nr:'DIN 18338'},
  {id:'SS-002',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Dachziegel Betondachstein tauschen je Stk',ei:'Stk',mn:12,me:18,mx:28,nr:'DIN 18338'},
  {id:'SS-003',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Dacheindeckung Teilfläche bis 10m² neu eindecken',ei:'m²',mn:55,me:85,mx:135,nr:'DIN 18338'},
  {id:'SS-004',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Dacheindeckung Vollsanierung Ziegel je m²',ei:'m²',mn:68,me:105,mx:168,nr:'DIN 18338'},
  {id:'SS-005',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Firstziegel erneuern je lfm',ei:'lfm',mn:28,me:43,mx:68,nr:'DIN 18338'},
  {id:'SS-006',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Dachrinne Halbrund Zink erneuern je lfm',ei:'lfm',mn:28,me:43,mx:68,nr:'DIN 18460'},
  {id:'SS-007',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Fallrohr Zinkblech erneuern je lfm',ei:'lfm',mn:22,me:34,mx:55,nr:'DIN 18460'},
  {id:'SS-008',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Dachlattung Sturmschaden reparieren je m²',ei:'m²',mn:18,me:27,mx:43,nr:'DIN 18338'},
  {id:'SS-009',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Unterspannbahn tauschen Teilfläche je m²',ei:'m²',mn:12,me:18,mx:28,nr:'DIN 18338'},
  {id:'SS-010',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Notabdichtung Dachfolie aufbringen je m²',ei:'m²',mn:8,me:13,mx:22,nr:''},
  {id:'SS-011',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Dachstuhl Sturmschaden Auflager reparieren je Stk',ei:'Stk',mn:145,me:225,mx:360,nr:''},
  {id:'SS-012',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Dachfenster Velux/Roto Sturmschaden erneuern je Stk',ei:'Stk',mn:485,me:745,mx:1195,nr:''},
  {id:'SS-013',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Flachdach Aufkantung Sturmschaden reparieren je lfm',ei:'lfm',mn:45,me:68,mx:108,nr:'DIN 18531'},
  {id:'SS-014',sa:'SS',kat:'Sturmschaden',uk:'Fassade',bez:'Außenputz abgeplatzter Bereich reparieren je m²',ei:'m²',mn:22,me:34,mx:55,nr:'DIN 18550'},
  {id:'SS-015',sa:'SS',kat:'Sturmschaden',uk:'Fassade',bez:'WDVS Sturmschaden Fassadendämmplatten erneuern je m²',ei:'m²',mn:55,me:85,mx:135,nr:'DIN 55699'},
  {id:'SS-016',sa:'SS',kat:'Sturmschaden',uk:'Fassade',bez:'Klinkerriemchen abgelöst neu aufmauern je m²',ei:'m²',mn:68,me:105,mx:168,nr:''},
  {id:'SS-017',sa:'SS',kat:'Sturmschaden',uk:'Fassade',bez:'Fassadenanstrich Teilfläche nach Sturmschaden je m²',ei:'m²',mn:8,me:13,mx:22,nr:''},
  {id:'SS-018',sa:'SS',kat:'Sturmschaden',uk:'Fenster',bez:'Fenster Holz/Kunststoff Sturmschaden erneuern je m²',ei:'m²',mn:285,me:435,mx:695,nr:'DIN EN 14351'},
  {id:'SS-019',sa:'SS',kat:'Sturmschaden',uk:'Fenster',bez:'Fensterglas Isolierverglasung 2-fach tauschen je m²',ei:'m²',mn:85,me:130,mx:210,nr:''},
  {id:'SS-020',sa:'SS',kat:'Sturmschaden',uk:'Fenster',bez:'Rollladenkasten Sturmschaden reparieren je Stk',ei:'Stk',mn:145,me:225,mx:360,nr:''},
  {id:'SS-021',sa:'SS',kat:'Sturmschaden',uk:'Fenster',bez:'Notabdichtung Fensteröffnung Folie/Sperrholz',ei:'Stk',mn:45,me:68,mx:108,nr:''},
  {id:'SS-022',sa:'SS',kat:'Sturmschaden',uk:'Außenanlagen',bez:'Carport Sturmschaden Dach reparieren',ei:'Psch',mn:380,me:580,mx:925,nr:''},
  {id:'SS-023',sa:'SS',kat:'Sturmschaden',uk:'Außenanlagen',bez:'Gartenzaun Sturmschaden reparieren je lfm',ei:'lfm',mn:35,me:52,mx:85,nr:''},
  {id:'SS-024',sa:'SS',kat:'Sturmschaden',uk:'Außenanlagen',bez:'Baum Sturmschaden Fällarbeiten je Stk',ei:'Stk',mn:185,me:285,mx:455,nr:''},
  {id:'SS-025',sa:'SS',kat:'Sturmschaden',uk:'Notabdichtung',bez:'Notabdichtung Dach Planen inkl. Sicherung je m²',ei:'m²',mn:8,me:13,mx:22,nr:''},
  {id:'SS-026',sa:'SS',kat:'Sturmschaden',uk:'Notabdichtung',bez:'Wasserschaden-Sofortmaßnahme nach Sturm Pauschal',ei:'Psch',mn:280,me:430,mx:685,nr:''},
  {id:'SS-027',sa:'SS',kat:'Sturmschaden',uk:'Dach',bez:'Blitzableiteranlage Sturmschaden prüfen und reparieren',ei:'Psch',mn:185,me:285,mx:455,nr:'DIN VDE 0185'},
  // SCHIMMEL/FEUCHTE
  {id:'SC-001',sa:'SC',kat:'Schimmel/Feuchte',uk:'Befundung',bez:'Schimmelanalyse Oberflächenabklatsch Laborbefund je Stk',ei:'Stk',mn:85,me:130,mx:210,nr:'DIN ISO 16000-17'},
  {id:'SC-002',sa:'SC',kat:'Schimmel/Feuchte',uk:'Befundung',bez:'Luftkeimmessung Schimmel Volumenmethode je Raum',ei:'Stk',mn:145,me:225,mx:360,nr:'DIN ISO 16000-17'},
  {id:'SC-003',sa:'SC',kat:'Schimmel/Feuchte',uk:'Befundung',bez:'Feuchtemesskampagne Raum Protokoll je Raum',ei:'Stk',mn:95,me:145,mx:230,nr:''},
  {id:'SC-004',sa:'SC',kat:'Schimmel/Feuchte',uk:'Befundung',bez:'Thermografieuntersuchung Wärmebrücken je m²',ei:'m²',mn:8,me:13,mx:22,nr:'DIN EN 13187'},
  {id:'SC-005',sa:'SC',kat:'Schimmel/Feuchte',uk:'Befundung',bez:'Bauteilöffnung Probenahme Innenraum je Stk',ei:'Stk',mn:125,me:190,mx:305,nr:''},
  {id:'SC-006',sa:'SC',kat:'Schimmel/Feuchte',uk:'Befundung',bez:'Taupunktanalyse Bauteil Berechnung',ei:'Psch',mn:145,me:225,mx:360,nr:'DIN EN ISO 13788'},
  {id:'SC-007',sa:'SC',kat:'Schimmel/Feuchte',uk:'Sanierung',bez:'Schimmelbefall entfernen kleiner Bereich bis 0,5 m²',ei:'Stk',mn:85,me:130,mx:210,nr:'UBA-Leitfaden'},
  {id:'SC-008',sa:'SC',kat:'Schimmel/Feuchte',uk:'Sanierung',bez:'Schimmelbefall entfernen größerer Bereich bis 2 m²',ei:'m²',mn:145,me:225,mx:360,nr:'UBA-Leitfaden'},
  {id:'SC-009',sa:'SC',kat:'Schimmel/Feuchte',uk:'Sanierung',bez:'Schimmelbefall Totalreinigung Raum inkl. Desinfektion je m²',ei:'m²',mn:18,me:27,mx:43,nr:'UBA-Leitfaden'},
  {id:'SC-010',sa:'SC',kat:'Schimmel/Feuchte',uk:'Sanierung',bez:'Schimmelsanierung Holzbalken Chemisch je m²',ei:'m²',mn:28,me:43,mx:68,nr:'DIN 68800-4'},
  {id:'SC-011',sa:'SC',kat:'Schimmel/Feuchte',uk:'Sanierung',bez:'Biozidbehandlung nach Schimmelsanierung je m²',ei:'m²',mn:8,me:13,mx:22,nr:''},
  {id:'SC-012',sa:'SC',kat:'Schimmel/Feuchte',uk:'Sanierung',bez:'Schutzanstrich Schimmelschutzfarbe je m²',ei:'m²',mn:12,me:18,mx:28,nr:''},
  {id:'SC-013',sa:'SC',kat:'Schimmel/Feuchte',uk:'Sanierung',bez:'Raumluftmessung nach Sanierung Freimessung',ei:'Psch',mn:185,me:285,mx:455,nr:'DIN ISO 16000-17'},
  {id:'SC-014',sa:'SC',kat:'Schimmel/Feuchte',uk:'Sanierung',bez:'Schimmelkontaminiertes Holz Austausch je m²',ei:'m²',mn:55,me:85,mx:135,nr:'DIN 68800-4'},
  {id:'SC-015',sa:'SC',kat:'Schimmel/Feuchte',uk:'Abdichtung',bez:'Kellerwandabdichtung innen bituminös je m²',ei:'m²',mn:28,me:43,mx:68,nr:'DIN 18533'},
  {id:'SC-016',sa:'SC',kat:'Schimmel/Feuchte',uk:'Abdichtung',bez:'Kellerwandabdichtung außen bituminös je m²',ei:'m²',mn:45,me:68,mx:108,nr:'DIN 18533'},
  {id:'SC-017',sa:'SC',kat:'Schimmel/Feuchte',uk:'Abdichtung',bez:'Horizontalsperre nachträglich Injektion je lfm',ei:'lfm',mn:32,me:48,mx:78,nr:'DIN 18533'},
  {id:'SC-018',sa:'SC',kat:'Schimmel/Feuchte',uk:'Abdichtung',bez:'Sanierputzsystem Innen WTA je m²',ei:'m²',mn:28,me:43,mx:68,nr:'WTA 2-9-04/D'},
  {id:'SC-019',sa:'SC',kat:'Schimmel/Feuchte',uk:'Abdichtung',bez:'Flüssigabdichtung Nasszelle Verbundabdichtung je m²',ei:'m²',mn:25,me:38,mx:62,nr:'DIN 18534'},
  {id:'SC-020',sa:'SC',kat:'Schimmel/Feuchte',uk:'Abdichtung',bez:'Balkonabdichtung Flüssigkunststoff je m²',ei:'m²',mn:35,me:52,mx:85,nr:'DIN 18531'},
  {id:'SC-021',sa:'SC',kat:'Schimmel/Feuchte',uk:'Abdichtung',bez:'Dampfbremse Einbau Dachschräge je m²',ei:'m²',mn:22,me:34,mx:55,nr:'DIN 4108-3'},
  {id:'SC-022',sa:'SC',kat:'Schimmel/Feuchte',uk:'Abdichtung',bez:'Fugenabdichtung Sanitärbereich Silikon erneuern je lfm',ei:'lfm',mn:8,me:13,mx:22,nr:'DIN 18534'},
  {id:'SC-023',sa:'SC',kat:'Schimmel/Feuchte',uk:'Lüftung',bez:'Lüftungsanlage dezentral je Raum einbauen',ei:'Stk',mn:485,me:745,mx:1195,nr:'DIN 1946-6'},
  {id:'SC-024',sa:'SC',kat:'Schimmel/Feuchte',uk:'Lüftung',bez:'Ventilator Einzelraumventilator mit Feuchtesteuerung',ei:'Stk',mn:145,me:225,mx:360,nr:'DIN 1946-6'},
  {id:'SC-025',sa:'SC',kat:'Schimmel/Feuchte',uk:'Lüftung',bez:'Lüftungskonzept Planung nach DIN 1946-6',ei:'Psch',mn:285,me:435,mx:695,nr:'DIN 1946-6'},
  {id:'SC-026',sa:'SC',kat:'Schimmel/Feuchte',uk:'Lüftung',bez:'Lüftungsanlage zentral mit WRG je m² Wohnfläche',ei:'m²',mn:28,me:43,mx:68,nr:'DIN 1946-6'},
  {id:'SC-027',sa:'SC',kat:'Schimmel/Feuchte',uk:'Lüftung',bez:'Lüftungskanal reinigen Querschnitt bis 200mm je lfm',ei:'lfm',mn:12,me:18,mx:28,nr:'VDI 6022'},
  // BAUMÄNGEL
  {id:'BA-001',sa:'BA',kat:'Baumängel',uk:'Risse',bez:'Rissprotokoll Aufnahme Rissbild je Bauteil',ei:'Psch',mn:95,me:145,mx:230,nr:''},
  {id:'BA-002',sa:'BA',kat:'Baumängel',uk:'Risse',bez:'Riss Haarriss schließen Injektionsharz je lfm',ei:'lfm',mn:22,me:34,mx:55,nr:''},
  {id:'BA-003',sa:'BA',kat:'Baumängel',uk:'Risse',bez:'Riss Mauerwerk Injektionsnadeln je lfm',ei:'lfm',mn:35,me:52,mx:85,nr:''},
  {id:'BA-004',sa:'BA',kat:'Baumängel',uk:'Risse',bez:'Rissmonitoring Gipsmarke Setzung je Stk',ei:'Stk',mn:18,me:27,mx:43,nr:''},
  {id:'BA-005',sa:'BA',kat:'Baumängel',uk:'Risse',bez:'Riss verputzen Innen je lfm',ei:'lfm',mn:12,me:18,mx:28,nr:'DIN 18550'},
  {id:'BA-006',sa:'BA',kat:'Baumängel',uk:'Risse',bez:'Riss Fassade schließen Außenputz je lfm',ei:'lfm',mn:18,me:27,mx:43,nr:'DIN 18550'},
  {id:'BA-007',sa:'BA',kat:'Baumängel',uk:'Risse',bez:'Riss Betonkonstruktion Epoxidharzinjektion je lfm',ei:'lfm',mn:55,me:85,mx:135,nr:''},
  {id:'BA-008',sa:'BA',kat:'Baumängel',uk:'Risse',bez:'Setzriss Schwelle Unterfangen lokaler Bereich',ei:'Psch',mn:485,me:745,mx:1195,nr:''},
  {id:'BA-009',sa:'BA',kat:'Baumängel',uk:'Setzungen',bez:'Setzungsprotokoll Bestandsaufnahme Nivellement',ei:'Psch',mn:285,me:435,mx:695,nr:''},
  {id:'BA-010',sa:'BA',kat:'Baumängel',uk:'Setzungen',bez:'Fundamentunterfangung Teilbereich je lfm',ei:'lfm',mn:485,me:745,mx:1195,nr:''},
  {id:'BA-011',sa:'BA',kat:'Baumängel',uk:'Abdichtung Keller',bez:'Kellerwandabdichtung innen Sanierputz je m²',ei:'m²',mn:28,me:43,mx:68,nr:'WTA 2-9-04/D'},
  {id:'BA-012',sa:'BA',kat:'Baumängel',uk:'Abdichtung Keller',bez:'Kellerwandabdichtung außen bituminös Dickschicht je m²',ei:'m²',mn:45,me:68,mx:108,nr:'DIN 18533'},
  {id:'BA-013',sa:'BA',kat:'Baumängel',uk:'Abdichtung Keller',bez:'Kellerdrainageleitung erneuern je lfm',ei:'lfm',mn:55,me:85,mx:135,nr:'DIN 4095'},
  {id:'BA-014',sa:'BA',kat:'Baumängel',uk:'Balkon',bez:'Balkonabdichtung Flüssigkunststoff PMMA je m²',ei:'m²',mn:35,me:52,mx:85,nr:'DIN 18531'},
  {id:'BA-015',sa:'BA',kat:'Baumängel',uk:'Balkon',bez:'Balkonabdichtung Foliensystem je m²',ei:'m²',mn:45,me:68,mx:108,nr:'DIN 18531'},
  {id:'BA-016',sa:'BA',kat:'Baumängel',uk:'Balkon',bez:'Balkonfliesen entfernen und Untergrund sanieren je m²',ei:'m²',mn:38,me:58,mx:92,nr:''},
  {id:'BA-017',sa:'BA',kat:'Baumängel',uk:'Balkon',bez:'Balkongefälle korrigieren je m²',ei:'m²',mn:55,me:85,mx:135,nr:''},
  {id:'BA-018',sa:'BA',kat:'Baumängel',uk:'Fenster/Türen',bez:'Fensterbank innen erneuern je lfm',ei:'lfm',mn:32,me:48,mx:78,nr:''},
  {id:'BA-019',sa:'BA',kat:'Baumängel',uk:'Fenster/Türen',bez:'Fensterbank außen Alu erneuern je lfm',ei:'lfm',mn:55,me:85,mx:135,nr:''},
  {id:'BA-020',sa:'BA',kat:'Baumängel',uk:'Fenster/Türen',bez:'Fensterdichtung tauschen je lfm',ei:'lfm',mn:8,me:13,mx:22,nr:''},
  {id:'BA-021',sa:'BA',kat:'Baumängel',uk:'Fenster/Türen',bez:'Fensterrahmen Anschluss abdichten Innen/Außen je lfm',ei:'lfm',mn:12,me:18,mx:28,nr:''},
  {id:'BA-022',sa:'BA',kat:'Baumängel',uk:'Fenster/Türen',bez:'Fenster justieren/einstellen je Stk',ei:'Stk',mn:45,me:68,mx:108,nr:''},
  {id:'BA-023',sa:'BA',kat:'Baumängel',uk:'Fenster/Türen',bez:'Innentür schleifen und lackieren',ei:'Stk',mn:85,me:130,mx:210,nr:''},
  {id:'BA-024',sa:'BA',kat:'Baumängel',uk:'Estrich/Boden',bez:'Estrichhohlstelle Injektion je m²',ei:'m²',mn:22,me:34,mx:55,nr:'DIN 18353'},
  {id:'BA-025',sa:'BA',kat:'Baumängel',uk:'Estrich/Boden',bez:'Estrichaufschüsselung schleifen je m²',ei:'m²',mn:18,me:27,mx:43,nr:'DIN 18353'},
  {id:'BA-026',sa:'BA',kat:'Baumängel',uk:'Estrich/Boden',bez:'Trittschalldämmung erneuern je m²',ei:'m²',mn:22,me:34,mx:55,nr:'DIN 4109'},
  {id:'BA-027',sa:'BA',kat:'Baumängel',uk:'Dach/Flachdach',bez:'Flachdachabdichtung Blasen reparieren je m²',ei:'m²',mn:28,me:43,mx:68,nr:'DIN 18531'},
  {id:'BA-028',sa:'BA',kat:'Baumängel',uk:'Dach/Flachdach',bez:'Attika Blechabdeckung abdichten je lfm',ei:'lfm',mn:35,me:52,mx:85,nr:''},
  {id:'BA-029',sa:'BA',kat:'Baumängel',uk:'Dach/Flachdach',bez:'Dachablauf reinigen und dichten je Stk',ei:'Stk',mn:65,me:98,mx:155,nr:''},
  {id:'BA-030',sa:'BA',kat:'Baumängel',uk:'Putz/Fassade',bez:'Außenputz Reparatur bis 1 m² je Stk',ei:'Stk',mn:85,me:130,mx:210,nr:'DIN 18550'},
  {id:'BA-031',sa:'BA',kat:'Baumängel',uk:'Putz/Fassade',bez:'WDVS Putzschicht reparieren je m²',ei:'m²',mn:35,me:52,mx:85,nr:'DIN 55699'},
  {id:'BA-032',sa:'BA',kat:'Baumängel',uk:'Putz/Fassade',bez:'Fassadenanstrich komplett je m²',ei:'m²',mn:12,me:18,mx:28,nr:''},
  {id:'BA-033',sa:'BA',kat:'Baumängel',uk:'Putz/Fassade',bez:'Innenputz Fehlstelle reparieren je m²',ei:'m²',mn:22,me:34,mx:55,nr:'DIN 18550'},
  {id:'BA-034',sa:'BA',kat:'Baumängel',uk:'Schall',bez:'Schallmessung Luftschall je Raum',ei:'Psch',mn:285,me:435,mx:695,nr:'DIN 4109'},
  {id:'BA-035',sa:'BA',kat:'Baumängel',uk:'Schall',bez:'Schallmessung Trittschall je Raum',ei:'Psch',mn:285,me:435,mx:695,nr:'DIN 4109'},
  {id:'BA-036',sa:'BA',kat:'Baumängel',uk:'Schall',bez:'Trittschalldämmung unter Estrich nachrüsten je m²',ei:'m²',mn:28,me:43,mx:68,nr:'DIN 4109'},
  {id:'BA-037',sa:'BA',kat:'Baumängel',uk:'Sonstiges',bez:'Gutachterkosten Feststellung Baumangel Pauschal',ei:'Psch',mn:485,me:745,mx:1195,nr:''},
  // ELEMENTARSCHADEN
  {id:'ES-001',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Aufräumarbeiten nach Überflutung je m²',ei:'m²',mn:18,me:27,mx:43,nr:''},
  {id:'ES-002',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Schlamm und Sediment entfernen je m²',ei:'m²',mn:22,me:34,mx:55,nr:''},
  {id:'ES-003',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Keller auspumpen Pumpeneinsatz je h',ei:'h',mn:85,me:130,mx:210,nr:''},
  {id:'ES-004',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Sanierungsanstrich nach Überschwemmung Keller je m²',ei:'m²',mn:12,me:18,mx:28,nr:''},
  {id:'ES-005',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Heizungsanlage nach Hochwasser spülen und instandsetzen',ei:'Psch',mn:480,me:740,mx:1185,nr:''},
  {id:'ES-006',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Elektroanlage nach Hochwasser prüfen und freigeben',ei:'Psch',mn:285,me:435,mx:695,nr:'DIN VDE 0100'},
  {id:'ES-007',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Rückstauklappe einbauen DN 100',ei:'Stk',mn:485,me:745,mx:1195,nr:'DIN EN 13564'},
  {id:'ES-008',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Rückstauklappe DN 150 einbauen',ei:'Stk',mn:580,me:885,mx:1415,nr:'DIN EN 13564'},
  {id:'ES-009',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Hochwasserschutzelemente Türdichtung montieren',ei:'Stk',mn:285,me:435,mx:695,nr:''},
  {id:'ES-010',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Bautrocknung nach Überschwemmung großflächig je m²',ei:'m²',mn:8,me:13,mx:22,nr:'VdS 3151'},
  {id:'ES-011',sa:'ES',kat:'Elementarschaden',uk:'Überschwemmung',bez:'Trocknungsprotokoll Hochwasserschaden komplett',ei:'Psch',mn:285,me:435,mx:695,nr:'VdS 3151'},
  {id:'ES-012',sa:'ES',kat:'Elementarschaden',uk:'Erdrutsch',bez:'Hangsicherung Böschung Gabionen je m²',ei:'m²',mn:85,me:130,mx:210,nr:''},
  {id:'ES-013',sa:'ES',kat:'Elementarschaden',uk:'Erdrutsch',bez:'Hangstabilisierung Erdnägel je Stk',ei:'Stk',mn:285,me:435,mx:695,nr:''},
  {id:'ES-014',sa:'ES',kat:'Elementarschaden',uk:'Erdrutsch',bez:'Drainageleitung Hang einbauen je lfm',ei:'lfm',mn:45,me:68,mx:108,nr:'DIN 4095'},
  {id:'ES-015',sa:'ES',kat:'Elementarschaden',uk:'Erdrutsch',bez:'Stützmauer Beton neu errichten je m²',ei:'m²',mn:185,me:285,mx:455,nr:''},
  {id:'ES-016',sa:'ES',kat:'Elementarschaden',uk:'Erdrutsch',bez:'Erdmassen abtragen und entsorgen je m³',ei:'m³',mn:28,me:43,mx:68,nr:''},
  {id:'ES-017',sa:'ES',kat:'Elementarschaden',uk:'Frost',bez:'Frostschaden Wasserleitung Kupfer reparieren je lfm',ei:'lfm',mn:55,me:85,mx:135,nr:'DIN EN 1057'},
  {id:'ES-018',sa:'ES',kat:'Elementarschaden',uk:'Frost',bez:'Frostschaden Heizungsanlage Vorlaufleitung reparieren',ei:'Psch',mn:285,me:435,mx:695,nr:''},
  {id:'ES-019',sa:'ES',kat:'Elementarschaden',uk:'Frost',bez:'Frostschaden Putz Außenwand reparieren je m²',ei:'m²',mn:22,me:34,mx:55,nr:'DIN 18550'},
  {id:'ES-020',sa:'ES',kat:'Elementarschaden',uk:'Frost',bez:'Frostschaden Pflaster/Terrasse reparieren je m²',ei:'m²',mn:35,me:52,mx:85,nr:''},
  {id:'ES-021',sa:'ES',kat:'Elementarschaden',uk:'Frost',bez:'Frostschaden Dachrinne/Fallrohr erneuern je lfm',ei:'lfm',mn:28,me:43,mx:68,nr:'DIN 18460'},
];

/* ── Schadensart → Tag ── */
const SA_TAGS = {
  'Wasserschaden':'WS','Schimmelbefall':'SC','Schimmel/Feuchte':'SC',
  'Brandschaden':'BS','Sturmschaden':'SS','Elementarschaden':'ES',
  'Baumängel':'BA','Baumängel allgemein':'BA','Feuchte':'SC'
};

function saTag(sa) {
  if (!sa) return null;
  for (const [k,v] of Object.entries(SA_TAGS)) {
    if (sa.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return null;
}

/* ── State ── */
let auswahl = {}; // id → {pos, menge}
let gefiltertPos = [];
let currentPage = 0;
const PAGE_SIZE = 25;

// Kontext: erst URL-Parameter, dann localStorage
(function ladeKontext() {
  var params = new URLSearchParams(window.location.search);
  var azParam = params.get('az');
  var saParam = params.get('sa');
  if (azParam) {
    localStorage.setItem('prova_letztes_az', azParam);
    if (saParam) localStorage.setItem('prova_schadenart', saParam);
  }
})();

const schadenart = localStorage.getItem('prova_schadenart') || '';
const aktenzeichen = localStorage.getItem('prova_letztes_az') || localStorage.getItem('prova_aktenzeichen') || '';

// Rückweg: zurück zur akte wenn AZ bekannt, sonst archiv
window._kostenRueck = function() {
  var az = aktenzeichen;
  if (az) { window.location.href = 'akte.html?az=' + encodeURIComponent(az); }
  else { window.location.href = 'archiv.html'; }
};

// Mobile Sidebar (nav.js/theme.js fehlen in diesem Deploy)
function openMobileSidebar(){
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sb-overlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobileSidebar(){
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sb-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
}

const tag = saTag(schadenart);

/* ── Init ── */
(function init() {
  // Badge-Hiding via prova-context.js

  // Header
  document.getElementById('badge-sa').textContent = '📋 ' + (schadenart || 'Alle Schadensarten');
  if (aktenzeichen) document.getElementById('badge-az').textContent = '📁 ' + aktenzeichen;

  // Unterkategorie-Filter befüllen
  const tagPositionen = tag ? POSITIONEN.filter(p => p.sa === tag) : POSITIONEN;
  const uks = [...new Set(tagPositionen.map(p => p.uk))].sort();
  const sel = document.getElementById('filterKat');
  uks.forEach(uk => {
    const o = document.createElement('option');
    o.value = uk; o.textContent = uk;
    sel.appendChild(o);
  });

  // Vorhandene Auswahl aus localStorage laden
  try {
    const saved = localStorage.getItem('prova_kostenermittlung');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.positionen) {
        data.positionen.forEach(item => {
          const pos = POSITIONEN.find(p => p.id === item.id);
          if (pos) auswahl[item.id] = { pos, menge: item.menge };
        });
        renderAuswahl();
      }
    }
  } catch(e) {}

  // Import: Positionsdatenbank → Kostenermittlung (Queue)
  (function importPositionenQueue(){
    var raw = localStorage.getItem('prova_positionen_queue');
    if(!raw) return;
    var q;
    try { q = JSON.parse(raw) || []; } catch(e) { return; }
    if(!Array.isArray(q) || !q.length) return;

    var currentAz = aktenzeichen || '';
    var remaining = [];
    var imported = 0;

    q.forEach(function(entry){
      if(!entry) return;
      var entryAz = entry.az || '';
      // Wenn Fall bekannt ist: nur passende Einträge importieren, Rest behalten
      if(currentAz && entryAz && entryAz !== currentAz){
        remaining.push(entry);
        return;
      }
      var id = entry.id || entry.nr; // positionen.html nutzt nr
      if(!id){ return; }
      var pos = POSITIONEN.find(function(p){ return p.id === id; });
      if(!pos){
        // Unbekannte Position → in Queue lassen, damit nichts verloren geht
        remaining.push(entry);
        return;
      }
      if(!auswahl[id]){
        auswahl[id] = { pos: pos, menge: 1 };
        imported++;
      }
    });

    // Queue aktualisieren (nicht importierte / andere Fälle behalten)
    try{
      if(remaining.length) localStorage.setItem('prova_positionen_queue', JSON.stringify(remaining));
      else localStorage.removeItem('prova_positionen_queue');
    }catch(e){}

    if(imported > 0){
      renderAuswahl();
      toast(imported + ' Position' + (imported===1?'':'en') + ' aus Positionsdatenbank übernommen ✓', 'ok');
    }
  })();

  filterPositionen();
})();
// Fallback: nochmal nach DOMContentLoaded falls IIFE zu früh lief
document.addEventListener('DOMContentLoaded', function() {
  if(typeof gefiltertPos !== 'undefined' && gefiltertPos.length === 0 && POSITIONEN.length > 0) {
    filterPositionen();
  }
});

/* ── Filter + Render ── */
function filterPositionen() {
  const suche = document.getElementById('searchInput').value.toLowerCase().trim();
  const kat = document.getElementById('filterKat').value;

  gefiltertPos = POSITIONEN.filter(p => {
    const matchSa = !tag || p.sa === tag;
    const matchKat = !kat || p.uk === kat;
    const matchSuche = !suche || p.bez.toLowerCase().includes(suche) || p.id.toLowerCase().includes(suche);
    return matchSa && matchKat && matchSuche;
  });

  currentPage = 0;
  renderPage();
}

function renderPage() {
  const body = document.getElementById('posTableBody');
  const pg = document.getElementById('pagination');
  const total = gefiltertPos.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const slice = gefiltertPos.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  if (!slice.length) {
    body.innerHTML = '<div class="no-results">Keine Positionen gefunden.</div>';
    pg.style.display = 'none';
    return;
  }

  body.innerHTML = slice.map(p => {
    const isAdded = !!auswahl[p.id];
    const menge = (auswahl[p.id] && typeof auswahl[p.id].menge !== 'undefined') ? auswahl[p.id].menge : '';
    return `<div class="pos-row ${isAdded ? 'added' : ''}" id="row-${p.id}">
      <div>
        <div class="pos-nr">${p.id}</div>
        <div class="pos-bez">${p.bez}</div>
        <div class="pos-kat">${p.uk}${p.nr ? ' · ' + p.nr : ''}</div>
      </div>
      <div class="pos-price min">${fmt(p.mn)}</div>
      <div class="pos-price med">${fmt(p.me)}</div>
      <div class="pos-price max">${fmt(p.mx)}</div>
      <div class="pos-einheit">${p.ei}</div>
      <div class="pos-qty-wrap">
        <input class="pos-qty" type="number" min="0" step="0.1"
          value="${menge}"
          placeholder="0"
          id="qty-${p.id}"
          onclick="event.stopPropagation()"
          oninput="updateMenge('${p.id}', this.value)">
      </div>
      <div>
        <button class="pos-add-btn ${isAdded ? 'active' : ''}"
          id="btn-${p.id}"
          onclick="togglePosition('${p.id}')"
          title="${isAdded ? 'Entfernen' : 'Hinzufügen'}">
          ${isAdded ? '✓' : '+'}
        </button>
      </div>
    </div>`;
  }).join('');

  // Pagination
  if (pages > 1) {
    pg.style.display = 'flex';
    document.getElementById('pgInfo').textContent = `Seite ${currentPage + 1} von ${pages} (${total} Positionen)`;
    document.getElementById('pgPrev').disabled = currentPage === 0;
    document.getElementById('pgNext').disabled = currentPage >= pages - 1;
  } else {
    pg.style.display = 'none';
  }
}

function pagePrev() { if (currentPage > 0) { currentPage--; renderPage(); } }
function pageNext() {
  const pages = Math.ceil(gefiltertPos.length / PAGE_SIZE);
  if (currentPage < pages - 1) { currentPage++; renderPage(); }
}

/* ── Interaktion ── */
function togglePosition(id) {
  const pos = POSITIONEN.find(p => p.id === id);
  if (!pos) return;
  if (auswahl[id]) {
    delete auswahl[id];
    toast('Position entfernt');
  } else {
    const mengeEl = document.getElementById('qty-' + id);
    const menge = parseFloat(mengeEl && mengeEl.value) || 1;
    auswahl[id] = { pos, menge };
    toast('Position hinzugefügt ✓', 'ok');
  }
  // Row aktualisieren
  const row = document.getElementById('row-' + id);
  const btn = document.getElementById('btn-' + id);
  if (row) row.classList.toggle('added', !!auswahl[id]);
  if (btn) { btn.classList.toggle('active', !!auswahl[id]); btn.textContent = auswahl[id] ? '✓' : '+'; }
  renderAuswahl();
}

function updateMenge(id, val) {
  if (auswahl[id]) {
    auswahl[id].menge = parseFloat(val) || 0;
    renderAuswahl();
  }
}

/* ── Auswahl-Sidebar ── */
function renderAuswahl() {
  const liste = document.getElementById('auswahlListe');
  const leer = document.getElementById('auswahlLeer');
  const count = document.getElementById('auswahl-count');
  const summeBox = document.getElementById('summeBox');
  const items = Object.values(auswahl);

  count.textContent = items.length;

  if (!items.length) {
    liste.innerHTML = '';
    liste.appendChild(leer);
    leer.style.display = 'block';
    summeBox.style.display = 'none';
    return;
  }

  leer.style.display = 'none';
  liste.innerHTML = items.map(({pos, menge}) => {
    const sumMe = menge * pos.me;
    return `<div class="auswahl-item">
      <div class="auswahl-item-top">
        <div class="auswahl-item-bez">${pos.bez}</div>
        <button class="auswahl-item-remove" onclick="togglePosition('${pos.id}')" title="Entfernen">×</button>
      </div>
      <div class="auswahl-item-detail">${menge} ${pos.ei} · ${fmt(pos.mn)}–${fmt(pos.mx)} €/${pos.ei}</div>
      <div class="auswahl-item-preis">= ${fmtSum(sumMe)} € (Median)</div>
    </div>`;
  }).join('');

  // Summen berechnen
  let sMin = 0, sMed = 0, sMax = 0;
  items.forEach(({pos, menge}) => {
    sMin += menge * pos.mn;
    sMed += menge * pos.me;
    sMax += menge * pos.mx;
  });
  document.getElementById('sumMin').textContent = fmtSum(sMin) + ' €';
  document.getElementById('sumMed').textContent = fmtSum(sMed) + ' €';
  document.getElementById('sumMax').textContent = fmtSum(sMax) + ' €';
  document.getElementById('sumTotal').textContent = fmtSum(sMed) + ' €';
  summeBox.style.display = 'block';
}

/* ── Speichern & Weiter ── */
function speichernUndWeiter() {
  const items = Object.values(auswahl);
  let sMin = 0, sMed = 0, sMax = 0;
  items.forEach(({pos, menge}) => {
    sMin += menge * pos.mn;
    sMed += menge * pos.me;
    sMax += menge * pos.mx;
  });

  const payload = {
    schadenart,
    aktenzeichen,
    erstellt_am: new Date().toISOString(),
    positionen: items.map(({pos, menge}) => ({
      id: pos.id,
      bezeichnung: pos.bez,
      einheit: pos.ei,
      menge,
      preis_min: pos.mn,
      preis_median: pos.me,
      preis_max: pos.mx,
      norm: pos.nr,
      summe_median: Math.round(menge * pos.me * 100) / 100
    })),
    gesamt_min: Math.round(sMin * 100) / 100,
    gesamt_median: Math.round(sMed * 100) / 100,
    gesamt_max: Math.round(sMax * 100) / 100
  };

  localStorage.setItem('prova_kostenermittlung', JSON.stringify(payload));
  localStorage.setItem('prova_kostenermittlung_done', 'true');
  toast('Kostenermittlung gespeichert ✓', 'ok');
  setTimeout(() => {
    var az = aktenzeichen;
    if (az) { window.location.href = 'akte.html?az=' + encodeURIComponent(az); }
    else { window.location.href = 'archiv.html'; }
  }, 600);
}

function überspringen() {
  localStorage.setItem('prova_kostenermittlung_done', 'false');
  localStorage.removeItem('prova_kostenermittlung');
  window.location.href = 'freigabe.html';
}

/* ── Hilfsfunktionen ── */
function fmt(n) { return n.toLocaleString('de-DE'); }
function fmtSum(n) { return n.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2}); }

function toast(msg, type = '') {
  const c = document.getElementById('toastC');
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'ok' ? ' toast-ok' : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastIn .3s ease reverse'; setTimeout(() => t.remove(), 280); }, 2500);
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function switchTab(id, btn) {
  document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  var pane = document.getElementById('tab-' + id);
  if (pane) pane.classList.add('active');
  if (btn) btn.classList.add('active');
  if (id === 'zusammenfassung') renderZusammenfassung();
}

// ============================================================
// AUFMASS-MODUL
// ============================================================
var _aufmassRaeume = [];
var _aufmassZaehler = 0;

var AUFMASS_EINHEITEN = ['m²','m³','lfm','Stk','Psch'];
var AUFMASS_TYPEN = [
  {label:'Wand (L × H)', felder:['Länge','Höhe'], formel: function(f){ return (f[0]||0)*(f[1]||0); }, einheit:'m²'},
  {label:'Boden/Decke (L × B)', felder:['Länge','Breite'], formel: function(f){ return (f[0]||0)*(f[1]||0); }, einheit:'m²'},
  {label:'Volumen (L × B × H)', felder:['Länge','Breite','Höhe'], formel: function(f){ return (f[0]||0)*(f[1]||0)*(f[2]||0); }, einheit:'m³'},
  {label:'Länge (lfm)', felder:['Länge'], formel: function(f){ return (f[0]||0); }, einheit:'lfm'},
  {label:'Anzahl (Stk)', felder:['Anzahl'], formel: function(f){ return (f[0]||0); }, einheit:'Stk'},
];

function aufmassRaumHinzufuegen() {
  _aufmassZaehler++;
  var id = 'ar-' + _aufmassZaehler;
  _aufmassRaeume.push({ id: id, name: 'Raum ' + _aufmassZaehler, zeilen: [] });
  renderAufmassRaeume();
  document.getElementById('aufmass-leer').style.display = 'none';
  // Auto-Focus auf Raumname
  setTimeout(function(){ var el = document.getElementById('ar-name-'+id); if(el) el.focus(); }, 50);
}

function aufmassZeileHinzufuegen(raumId) {
  var raum = _aufmassRaeume.find(function(r){return r.id===raumId;});
  if (!raum) return;
  raum.zeilen.push({ id: raumId+'-z-'+Date.now(), typ: 0, felder:[0,0,0], bezeichnung:'', ergebnis: 0 });
  renderAufmassRaeume();
}

function aufmassBerechne(zeile) {
  var t = AUFMASS_TYPEN[zeile.typ] || AUFMASS_TYPEN[0];
  return Math.round(t.formel(zeile.felder) * 100) / 100;
}

function renderAufmassRaeume() {
  var container = document.getElementById('aufmass-raeume');
  var leer = document.getElementById('aufmass-leer');
  if (!_aufmassRaeume.length) { leer.style.display='block'; container.innerHTML=''; return; }
  leer.style.display = 'none';
  container.innerHTML = '';

  _aufmassRaeume.forEach(function(raum) {
    var raumTotal = raum.zeilen.reduce(function(s,z){ return s + aufmassBerechne(z); }, 0);
    var div = document.createElement('div');
    div.className = 'aufmass-card';
    div.id = raum.id;

    var typenOptionen = AUFMASS_TYPEN.map(function(t,i){
      return '<option value="'+i+'">'+t.label+'</option>';
    }).join('');

    var zeilenHtml = raum.zeilen.map(function(z, zi) {
      var t = AUFMASS_TYPEN[z.typ] || AUFMASS_TYPEN[0];
      var ergebnis = aufmassBerechne(z);
      var felderHtml = t.felder.map(function(fl, fi){
        return '<td style="padding:4px 8px;"><input class="aufmass-input" type="number" min="0" step="0.01" placeholder="'+fl+'" value="'+(z.felder[fi]||'')+'" data-rid="'+raum.id+'" data-zi="'+zi+'" data-fi="'+fi+'" oninput="aufmassUpdateFeld(this.dataset.rid,this.dataset.zi,this.dataset.fi,this.value)"></td>';
      }).join('');
      // Fülle leere Felder auf
      while (t.felder.length + felderHtml.split('<td').length - 2 < 3) {
        felderHtml += '<td style="padding:4px 8px;"></td>';
      }
      return '<tr>'+
        '<td style="padding:4px 8px;"><input style="background:var(--bg3);border:1px solid var(--border2);border-radius:5px;padding:4px 7px;color:var(--text);font-size:12px;width:140px;font-family:var(--font-ui);" type="text" placeholder="Bezeichnung" value="'+escHtmlAufmass(z.bezeichnung)+'" data-rid="'+raum.id+'" data-zi="'+zi+'" oninput="aufmassUpdateBez(this.dataset.rid,this.dataset.zi,this.value)"></td>'+
        '<td style="padding:4px 8px;"><select style="background:var(--bg3);border:1px solid var(--border2);border-radius:5px;padding:4px 7px;color:var(--text);font-size:11px;font-family:var(--font-ui);" data-rid="'+raum.id+'" data-zi="'+zi+'" onchange="aufmassUpdateTyp(this.dataset.rid,this.dataset.zi,this.value)">'+AUFMASS_TYPEN.map(function(tt,ti){return '<option value="'+ti+'"'+(ti===z.typ?' selected':'')+'>'+tt.label+'</option>';}).join('')+'</select></td>'+
        felderHtml+
        '<td style="padding:4px 8px;" class="aufmass-result">'+ergebnis.toFixed(2).replace('.',',')+' '+t.einheit+'</td>'+
        '<td style="padding:4px 8px;"><button data-rid="'+raum.id+'" data-zi="'+zi+'" onclick="aufmassZeileLoeschen(this.dataset.rid,this.dataset.zi)" style="background:none;border:none;color:rgba(239,68,68,.6);cursor:pointer;font-size:14px;padding:2px 5px;">×</button></td>'+
      '</tr>';
    }).join('');

    div.innerHTML =
      '<div class="aufmass-raum-header">'+
        '<input id="ar-name-'+raum.id+'" style="background:transparent;border:none;color:var(--text);font-size:13px;font-weight:700;font-family:var(--font-ui);outline:none;min-width:150px;" value="'+escHtmlAufmass(raum.name)+'" data-rid="'+raum.id+'" oninput="aufmassUpdateRaumName(this.dataset.rid,this.value)" placeholder="Raumname">'+
        '<div style="display:flex;gap:6px;">'+
          '<button data-rid="'+raum.id+'" onclick="aufmassZeileHinzufuegen(this.dataset.rid)" style="padding:5px 10px;background:rgba(79,142,247,.12);border:1px solid rgba(79,142,247,.3);border-radius:6px;color:#93C5FD;font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font-ui);">+ Zeile</button>'+
          '<button data-rid="'+raum.id+'" onclick="aufmassRaumLoeschen(this.dataset.rid)" style="padding:5px 8px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;color:var(--text3);font-size:11px;cursor:pointer;font-family:var(--font-ui);">🗑</button>'+
        '</div>'+
      '</div>'+
      (raum.zeilen.length ?
        '<table class="aufmass-table"><thead><tr><th>Bezeichnung</th><th>Typ</th><th style="text-align:right">Maß 1</th><th style="text-align:right">Maß 2</th><th style="text-align:right">Maß 3</th><th style="text-align:right">Ergebnis</th><th></th></tr></thead><tbody>'+zeilenHtml+'</tbody></table>'
        : '<div style="padding:14px 16px;font-size:12px;color:var(--text3);">Noch keine Zeilen — + Zeile hinzufügen</div>')+
      '<div class="aufmass-summe-row">'+
        '<span style="font-size:12px;color:var(--text3);">Summe '+raum.name+'</span>'+
        '<div style="display:flex;align-items:center;gap:10px;">'+
          '<span style="font-size:13px;font-weight:700;color:var(--green);">'+raumTotal.toFixed(2).replace('.',',')+'</span>'+
          '<button class="aufmass-uebernehmen" data-rid="'+raum.id+'" onclick="aufmassInPositionenUebernehmen(this.dataset.rid)">→ In Positionen</button>'+
        '</div>'+
      '</div>';

    container.appendChild(div);
  });
}

function aufmassUpdateRaumName(raumId, val) {
  var r = _aufmassRaeume.find(function(r){return r.id===raumId;});
  if (r) r.name = val;
}
function aufmassUpdateFeld(raumId, zi, fi, val) {
  var r = _aufmassRaeume.find(function(r){return r.id===raumId;});
  if (!r || !r.zeilen[zi]) return;
  r.zeilen[zi].felder[fi] = parseFloat(val)||0;
  renderAufmassRaeume();
}
function aufmassUpdateTyp(raumId, zi, val) {
  var r = _aufmassRaeume.find(function(r){return r.id===raumId;});
  if (!r || !r.zeilen[zi]) return;
  r.zeilen[zi].typ = parseInt(val)||0;
  r.zeilen[zi].felder = [0,0,0];
  renderAufmassRaeume();
}
function aufmassUpdateBez(raumId, zi, val) {
  var r = _aufmassRaeume.find(function(r){return r.id===raumId;});
  if (r && r.zeilen[zi]) r.zeilen[zi].bezeichnung = val;
}
function aufmassZeileLoeschen(raumId, zi) {
  var r = _aufmassRaeume.find(function(r){return r.id===raumId;});
  if (r) { r.zeilen.splice(zi,1); renderAufmassRaeume(); }
}
function aufmassRaumLoeschen(raumId) {
  if (!confirm('Raum löschen?')) return;
  _aufmassRaeume = _aufmassRaeume.filter(function(r){return r.id!==raumId;});
  renderAufmassRaeume();
}

// Aufmaß-Ergebnis in Position übertragen
function aufmassInPositionenUebernehmen(raumId) {
  var raum = _aufmassRaeume.find(function(r){return r.id===raumId;});
  if (!raum) return;

  // Zeige Modal: welche Position soll die Menge bekommen?
  var gesamt = raum.zeilen.reduce(function(s,z){ return s + aufmassBerechne(z); }, 0);
  var t = AUFMASS_TYPEN[raum.zeilen[0] ? raum.zeilen[0].typ : 0];

  var msg = 'Aufmaß "' + raum.name + '": ' + gesamt.toFixed(2).replace('.',',') + ' ' + (t ? t.einheit : '') +
    '\nMöchten Sie diese Menge für ausgewählte Positionen übernehmen?\n\n' +
    'Tipp: Wechseln Sie zu "Positionen", wählen Sie eine Position aus und ' +
    'klicken Sie dann erneut "→ In Positionen" — oder tragen Sie die Menge manuell ein.';

  // Speichere Aufmaß-Ergebnis in localStorage für manuellen Abruf
  try {
    var aufmassCache = JSON.parse(localStorage.getItem('prova_aufmass_cache') || '[]');
    aufmassCache.unshift({ raumName: raum.name, menge: gesamt, einheit: t ? t.einheit : '', ts: new Date().toISOString() });
    if (aufmassCache.length > 20) aufmassCache = aufmassCache.slice(0,20);
    localStorage.setItem('prova_aufmass_cache', JSON.stringify(aufmassCache));
  } catch(e) {}

  toast('Aufmaß "' + raum.name + '" gespeichert: ' + gesamt.toFixed(2).replace('.',',') + ' ' + (t?t.einheit:''), 'ok');

  // Wechsle zu Positionen-Tab mit Hinweis
  switchTab('positionen', document.querySelector('.tab-btn'));
  var searchEl = document.getElementById('searchInput');
  if (searchEl) { searchEl.focus(); searchEl.placeholder = 'Menge ' + gesamt.toFixed(2) + ' ' + (t?t.einheit:'') + ' — Position suchen und Menge eintragen'; }
}

function escHtmlAufmass(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ============================================================
// ZUSAMMENFASSUNG-TAB
// ============================================================
function renderZusammenfassung() {
  var ausgewählt = auswahl || {};
  var keys = Object.keys(ausgewählt);

  // KPI-Grid
  var kpiGrid = document.getElementById('zsf-kpi-grid');
  if (kpiGrid) {
    var gesamtMin = 0, gesamtMed = 0, gesamtMax = 0;
    keys.forEach(function(id) {
      var p = POSITIONEN.find(function(p){return p.id===id;});
      var m = ausgewählt[id] || 1;
      if (p) { gesamtMin += p.mn*m; gesamtMed += p.me*m; gesamtMax += p.mx*m; }
    });
    kpiGrid.innerHTML = [
      {label:'Positionen', val: keys.length, sub:'ausgewählt', color:'var(--accent)'},
      {label:'Min-Schätzung', val: '≈ ' + Math.round(gesamtMin).toLocaleString('de-DE') + ' €', sub:'Netto', color:'var(--green)'},
      {label:'Median-Schätzung', val: '≈ ' + Math.round(gesamtMed).toLocaleString('de-DE') + ' €', sub:'Netto (Richtwert)', color:'var(--text)'},
      {label:'Max-Schätzung', val: '≈ ' + Math.round(gesamtMax).toLocaleString('de-DE') + ' €', sub:'Netto', color:'var(--warn)'},
    ].map(function(k) {
      return '<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:14px 16px;">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:6px;">'+k.label+'</div>' +
        '<div style="font-size:1.3rem;font-weight:800;color:'+k.color+';">'+k.val+'</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:3px;">'+k.sub+'</div>' +
      '</div>';
    }).join('');
  }

  // Positions-Tabelle
  var tbody = document.getElementById('zsf-tbody');
  var tfoot = document.getElementById('zsf-tfoot');
  if (!tbody) return;

  if (!keys.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3);">Noch keine Positionen ausgewählt</td></tr>';
    tfoot.innerHTML = '';
    return;
  }

  var gesamtMin=0, gesamtMed=0, gesamtMax=0;
  tbody.innerHTML = keys.map(function(id) {
    var p = POSITIONEN.find(function(p){return p.id===id;});
    if (!p) return '';
    var m = ausgewählt[id] || 1;
    gesamtMin += p.mn*m; gesamtMed += p.me*m; gesamtMax += p.mx*m;
    return '<tr>' +
      '<td style="padding:7px 12px;color:var(--text2);">'+escHtmlAufmass(p.bez)+'</td>' +
      '<td style="padding:7px 12px;text-align:right;color:var(--text2);">'+m+'</td>' +
      '<td style="padding:7px 12px;text-align:right;color:var(--text3);">'+p.ei+'</td>' +
      '<td style="padding:7px 12px;text-align:right;color:var(--text3);">'+(p.mn*m).toLocaleString('de-DE')+'</td>' +
      '<td style="padding:7px 12px;text-align:right;font-weight:600;color:var(--text);">'+(p.me*m).toLocaleString('de-DE')+'</td>' +
      '<td style="padding:7px 12px;text-align:right;color:var(--text3);">'+(p.mx*m).toLocaleString('de-DE')+'</td>' +
    '</tr>';
  }).join('');

  tfoot.innerHTML = '<tr style="background:var(--surface2);">' +
    '<td colspan="3" style="padding:9px 12px;font-weight:700;color:var(--text);">Gesamt</td>' +
    '<td style="padding:9px 12px;text-align:right;font-weight:700;color:var(--green);">'+Math.round(gesamtMin).toLocaleString('de-DE')+' €</td>' +
    '<td style="padding:9px 12px;text-align:right;font-weight:800;color:var(--text);">'+Math.round(gesamtMed).toLocaleString('de-DE')+' €</td>' +
    '<td style="padding:9px 12px;text-align:right;font-weight:700;color:var(--warn);">'+Math.round(gesamtMax).toLocaleString('de-DE')+' €</td>' +
  '</tr>';
}

function zsf_exportCSV() {
  var ausgewählt = auswahl || {};
  var keys = Object.keys(ausgewählt);
  if (!keys.length) { toast('Keine Positionen ausgewählt', ''); return; }

  var header = 'Positions-Nr;Bezeichnung;Einheit;Menge;Min €;Median €;Max €;GP Min;GP Median;GP Max;Norm';
  var rows = keys.map(function(id) {
    var p = POSITIONEN.find(function(p){return p.id===id;});
    if (!p) return '';
    var m = ausgewählt[id] || 1;
    return [p.id, '"'+p.bez+'"', p.ei, m, p.mn, p.me, p.mx,
      Math.round(p.mn*m), Math.round(p.me*m), Math.round(p.mx*m), p.nr||''].join(';');
  }).filter(Boolean).join('\n');

  var az = localStorage.getItem('prova_letztes_az') || 'Kostenermittlung';
  var csv = '\uFEFF' + header + '\n' + rows;
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='PROVA_Kostenermittlung_'+az+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('CSV exportiert ✅', 'ok');
}

/* ─────────────────────────────────────────── */

var _supT;
var _SFAQ=[
  {q:['pdf','download'],a:'PDFs werden nach der Freigabe automatisch erstellt und per E-Mail versendet.'},
  {q:['rechnung','jveg'],a:'Im JVEG-Rechner können Sie Stunden erfassen und direkt "Als Rechnung übernehmen" klicken.'},
  {q:['frist','termin','kalender'],a:'Unter Kalender können Sie alle Fristen und Termine einsehen und neu anlegen.'},
  {q:['passwort','login'],a:'Das Passwort kann nur durch einen Administrator zurückgesetzt werden. Bitte wenden Sie sich an support@prova-systems.de.'}
];
function supAnalyse(){clearTimeout(_supT);_supT=setTimeout(function(){var txt=(document.getElementById('sup-betreff').value+' '+document.getElementById('sup-msg').value).toLowerCase();var f=_SFAQ.find(function(x){return x.q.some(function(w){return txt.includes(w);});});var box=document.getElementById('sup-faq-box');if(f){document.getElementById('sup-faq-txt').textContent=f.a;box.style.display='block';}else box.style.display='none';},600);}
function supFaqOk(){document.getElementById('sup-form').style.display='none';document.getElementById('sup-faq-box').style.display='none';document.getElementById('sup-ok').style.display='block';}
function supClose(){document.getElementById('sup-modal').classList.remove('open');document.getElementById('sup-ok').style.display='none';document.getElementById('sup-form').style.display='block';document.getElementById('sup-betreff').value='';document.getElementById('sup-msg').value='';}
async function supSend(){var b=document.getElementById('sup-betreff').value.trim(),n=document.getElementById('sup-msg').value.trim();if(!b||!n){document.getElementById('sup-err').style.display='block';return;}document.getElementById('sup-err').style.display='none';var btn=document.getElementById('sup-btn');btn.disabled=true;btn.textContent='⏳ Wird gesendet...';try{await fetch('https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({betreff:b,nachricht:n,sv_email:localStorage.getItem('prova_sv_email')||'',paket:paket,seite:window.location.pathname,ts:new Date().toISOString()})});}catch(e){}document.getElementById('sup-form').style.display='none';document.getElementById('sup-faq-box').style.display='none';document.getElementById('sup-ok').style.display='block';}

/* ─────────────────────────────────────────── */

(function(){
  /* ─── PROVA.ctx (DRY — prova-context.js) ─── */
var paket = window.PROVA ? PROVA.ctx.paket : (localStorage.getItem('prova_paket') || 'Solo');
var pc    = window.PROVA ? PROVA.ctx.paketColor : ({'Solo':'#4f8ef7','Team':'#a78bfa'}[paket] || '#4f8ef7');
var AT_BASE = window.PROVA ? PROVA.AT.BASE : 'appJ7bLlAHZoxENWE';
var appUrl  = window.PROVA ? PROVA.ctx.appUrl : (paket === 'Team' ? 'app.html' : 'app.html');
/* Badge-Hiding: erledigt von prova-context.js */
  
   // Paket steht in Sidebar unten
  
})();

/* ─────────────────────────────────────────── */

/* ================================================================
   PROVA Fall-Kontext-System v1.0
   Zeigt auf jeder Workflow/Werkzeug-Seite den aktiven Fall-Kontext
   und führt den SV zum nächsten Schritt.
   
   Aktiviert sich automatisch wenn ein aktiver Fall vorhanden ist.
   Kein Eingriff in bestehende Seiten-Logik.
================================================================ */

(function() {
'use strict';

// ── WORKFLOW-KONFIGURATION ──────────────────────────────────────────────
var WORKFLOW = [
  {
    schritt: 1,
    name: 'Fall anlegen',
    seite: 'app.html',
    icon: '📋',
    farbe: '#4f8ef7'
  },
  {
    schritt: 2,
    name: 'Diktat & Fotos',
    seite: 'app.html',
    icon: '🎙️',
    farbe: '#4f8ef7'
  },
  {
    schritt: 3,
    name: 'KI-Analyse',
    seite: 'app.html',
    icon: '🤖',
    farbe: '#6366f1'
  },
  {
    schritt: 4,
    name: '§6 Fachurteil',
    seite: 'stellungnahme.html',
    icon: '⚖️',
    farbe: '#f59e0b'
  },
  {
    schritt: 5,
    name: 'Freigabe',
    seite: 'freigabe.html',
    icon: '✅',
    farbe: '#10b981'
  },
  {
    schritt: 6,
    name: 'Rechnung',
    seite: 'rechnungen.html',
    icon: '💶',
    farbe: '#10b981'
  },
  {
    schritt: 7,
    name: 'Abschluss',
    seite: 'archiv.html',
    icon: '📁',
    farbe: '#6b7280'
  }
];

// ── WERKZEUGE (kontextuell, kein fester Workflow-Schritt) ───────────────
var WERKZEUGE = {
  'normen.html':         { name: 'Normendatenbank',    icon: '📚', zurück: true },
  'positionen.html':     { name: 'Positionsdatenbank', icon: '📦', zurück: true },
  'textbausteine.html':  { name: 'Textbausteine',      icon: '✏️',  zurück: true },
  'jveg.html':           { name: 'JVEG-Rechner',       icon: '⚖️',  zurück: false },
  'kostenermittlung.html':{ name: 'Kosten & Aufmaß',   icon: '📐', zurück: true },
  'briefvorlagen.html':  { name: 'Briefvorlagen',      icon: '✉️',  zurück: false }
};

// ── SEITE BESTIMMEN ─────────────────────────────────────────────────────
var currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
if (currentPage === '') currentPage = 'dashboard.html';

// ── AKTUELLEN SCHRITT BESTIMMEN ─────────────────────────────────────────
function getCurrentSchritt() {
  var basePage = currentPage.split('#')[0];
  for (var i = 0; i < WORKFLOW.length; i++) {
    if (WORKFLOW[i].seite.split('#')[0] === basePage) {
      return WORKFLOW[i].schritt;
    }
  }
  return null;
}

// ── FALL-KONTEXT LADEN ──────────────────────────────────────────────────
function ladeFallKontext() {
  // Versuche aus URL-Parameter zu laden
  var params = new URLSearchParams(window.location.search);
  var urlAz   = params.get('az') || params.get('fall') || params.get('aktenzeichen');
  
  // Dann aus sessionStorage/localStorage
  var az         = urlAz
                 || sessionStorage.getItem('prova_current_az')
                 || localStorage.getItem('prova_letztes_az')
                 || '';
  
  var schadenart = sessionStorage.getItem('prova_current_schadenart')
                 || localStorage.getItem('prova_schadenart')
                 || '';
  
  var adresse    = sessionStorage.getItem('prova_current_objekt')
                 || localStorage.getItem('prova_adresse')
                 || '';
  
  var recordId   = sessionStorage.getItem('prova_record_id')
                 || sessionStorage.getItem('prova_current_record_id')
                 || '';
  
  if (!az) return null;
  
  return { az: az, schadenart: schadenart, adresse: adresse, recordId: recordId };
}

// ── NÄCHSTER SCHRITT ─────────────────────────────────────────────────────
function naechsterSchritt(aktuellerSchritt) {
  if (!aktuellerSchritt) return null;
  for (var i = 0; i < WORKFLOW.length; i++) {
    if (WORKFLOW[i].schritt === aktuellerSchritt + 1) {
      return WORKFLOW[i];
    }
  }
  return null;
}

// ── BANNER HTML BAUEN ───────────────────────────────────────────────────
function baueBanner(kontext, aktuellerSchritt, istWerkzeug) {
  var az        = kontext.az;
  var sa        = kontext.schadenart;
  var adr       = kontext.adresse;
  var recordId  = kontext.recordId;
  
  // Schadensart Farbe
  var saFarben = {
    'Schimmelbefall': '#10b981',
    'Wasserschaden':  '#3b82f6',
    'Brandschaden':   '#ef4444',
    'Sturmschaden':   '#8b5cf6',
    'Baumängel':      '#f59e0b',
    'Sonstiger Schaden': '#6b7280'
  };
  var saFarbe = saFarben[sa] || '#4f8ef7';
  
  // Akte-Link bauen
  var akteLink = recordId
    ? 'akte.html?id=' + recordId
    : az
      ? 'akte.html?az=' + encodeURIComponent(az)
      : 'archiv.html';
  
  // Nächster-Schritt Button
  var naechsterBtn = '';
  if (!istWerkzeug && aktuellerSchritt) {
    var naechster = naechsterSchritt(aktuellerSchritt);
    if (naechster) {
      var naechsterUrl = naechster.seite;
      // AZ mitgeben wenn relevant
      if (naechster.seite.indexOf('stellungnahme') >= 0 && az) {
        naechsterUrl = naechster.seite + '?az=' + encodeURIComponent(az);
      } else if (naechster.seite.indexOf('freigabe') >= 0 && recordId) {
        naechsterUrl = naechster.seite + '?id=' + recordId;
      } else if (naechster.seite.indexOf('rechnungen') >= 0 && az) {
        naechsterUrl = naechster.seite + '?az=' + encodeURIComponent(az);
      } else if (naechster.seite.indexOf('archiv') >= 0) {
        naechsterUrl = naechster.seite;
      }
      
      naechsterBtn = '<a href="' + naechsterUrl + '" style="'
        + 'display:inline-flex;align-items:center;gap:5px;padding:4px 12px;'
        + 'background:' + naechster.farbe + '22;border:1px solid ' + naechster.farbe + '44;'
        + 'border-radius:999px;font-size:11px;font-weight:700;color:' + naechster.farbe + ';'
        + 'text-decoration:none;white-space:nowrap;transition:all .15s;'
        + '" onmouseover="this.style.background=\'' + naechster.farbe + '33\'"'
        + ' onmouseout="this.style.background=\'' + naechster.farbe + '22\'">'
        + naechster.icon + ' ' + naechster.name + ' \u2192'
        + '</a>';
    }
  }
  
  // Zurück-zu-Fall Button (für Werkzeuge)
  var zurueckBtn = '';
  if (istWerkzeug && WERKZEUGE[currentPage] && WERKZEUGE[currentPage].zurück) {
    zurueckBtn = '<a href="' + akteLink + '" style="'
      + 'display:inline-flex;align-items:center;gap:5px;padding:4px 10px;'
      + 'background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.25);'
      + 'border-radius:999px;font-size:11px;font-weight:600;color:#4f8ef7;'
      + 'text-decoration:none;white-space:nowrap;'
      + '">← Zurück zu ' + az + '</a>';
  }
  
  // Akte-Link in AZ
  var azHtml = '<a href="' + akteLink + '" style="'
    + 'font-weight:800;font-size:13px;color:var(--text, #e2e8f0);'
    + 'text-decoration:none;letter-spacing:.02em;'
    + 'border-bottom:1px solid rgba(255,255,255,.2);'
    + '" title="Akte öffnen">' + az + '</a>';
  
  // Schrittanzeige
  var schrittHtml = '';
  if (aktuellerSchritt && !istWerkzeug) {
    schrittHtml = '<span style="font-size:10px;color:rgba(255,255,255,.4);white-space:nowrap;">'
      + 'Schritt ' + aktuellerSchritt + ' von 7'
      + '</span>';
    
    // Mini-Progress (7 Punkte)
    var dots = '';
    for (var s = 1; s <= 7; s++) {
      var dotColor = s < aktuellerSchritt
        ? '#10b981'
        : s === aktuellerSchritt
          ? '#4f8ef7'
          : 'rgba(255,255,255,.15)';
      dots += '<span style="width:6px;height:6px;border-radius:50%;background:' + dotColor
            + ';display:inline-block;' + (s < 7 ? 'margin-right:3px;' : '') + '"></span>';
    }
    schrittHtml += '<span style="display:inline-flex;align-items:center;margin-left:6px;">' + dots + '</span>';
  }
  
  // Banner HTML
  var html = '<div id="prova-fall-kontext-banner" style="'
    + 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;'
    + 'padding:7px 16px 7px 20px;'
    + 'background:linear-gradient(90deg,rgba(79,142,247,.12) 0%,rgba(10,15,28,.0) 100%);'
    + 'border-bottom:1px solid rgba(79,142,247,.15);'
    + 'font-family:inherit;position:relative;z-index:10;'
    + 'min-height:36px;'
    + '">'
    
    // AZ + Schadenart
    + '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">'
    + '<span style="width:8px;height:8px;border-radius:50%;background:' + saFarbe + ';flex-shrink:0;"></span>'
    + azHtml;
    
  if (sa) {
    html += '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:' + saFarbe + '18;color:' + saFarbe + ';font-weight:600;white-space:nowrap;">' + sa + '</span>';
  }
  
  if (adr && adr.length > 2 && adr !== '—') {
    html += '<span style="font-size:11px;color:rgba(255,255,255,.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;" title="' + adr + '">'
          + adr.split(',')[0] // nur Straße, kürzer
          + '</span>';
  }
  
  html += '</div>'; // end flex-1
  
  // Mitte: Schritt-Anzeige
  if (schrittHtml) {
    html += '<div style="display:flex;align-items:center;gap:4px;">' + schrittHtml + '</div>';
  }
  
  // Rechts: Werkzeug-Zurück oder Nächster-Schritt
  if (zurueckBtn) {
    html += '<div>' + zurueckBtn + '</div>';
  }
  if (naechsterBtn) {
    html += '<div>' + naechsterBtn + '</div>';
  }
  
  html += '</div>'; // end banner
  
  return html;
}

// ── BANNER EINFÜGEN ─────────────────────────────────────────────────────
function einfuegenBanner() {
  // Nicht auf Dashboard, Zentrale, Login, Onboarding
  var ausnahmen = ['dashboard.html', 'archiv.html', 'app-login.html', 
                   'onboarding.html', 'onboarding-schnellstart.html',
                   'index.html', 'impressum.html', 'datenschutz.html',
                   'agb.html', 'avv.html', 'termine.html', 'kontakte.html',
                   'einstellungen.html'];
  
  if (ausnahmen.indexOf(currentPage) >= 0) return;
  
  var kontext = ladeFallKontext();
  if (!kontext) return; // Kein aktiver Fall — kein Banner
  
  var aktuellerSchritt = getCurrentSchritt();
  var istWerkzeug = !!WERKZEUGE[currentPage];
  
  var bannerHtml = baueBanner(kontext, aktuellerSchritt, istWerkzeug);
  
  // Einfüge-Strategie: nach <header class="topbar"> oder nach <div class="topbar">
  // Suche den richtigen Einfügepunkt
  var insertAfter = null;
  
  // Strategie 1: Nach topbar Header
  var topbar = document.querySelector('header.topbar, div.topbar, .topbar');
  if (topbar) {
    insertAfter = topbar;
  }
  
  // Strategie 2: Als erstes Child von main oder page-content
  if (!insertAfter) {
    insertAfter = document.querySelector('main, .page-content, .main, .page');
    if (insertAfter) {
      insertAfter.insertAdjacentHTML('afterbegin', bannerHtml);
      return;
    }
  }
  
  if (insertAfter) {
    insertAfter.insertAdjacentHTML('afterend', bannerHtml);
  }
}

// ── INIT ────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', einfuegenBanner);
} else {
  einfuegenBanner();
}

// ── PUBLIC API ──────────────────────────────────────────────────────────
window.PROVA_KONTEXT = {
  // Erlaubt anderen Scripts den Fall-Kontext zu setzen
  setFall: function(az, schadenart, adresse, recordId) {
    if (az) localStorage.setItem('prova_letztes_az', az);
    if (schadenart) localStorage.setItem('prova_schadenart', schadenart);
    if (adresse) localStorage.setItem('prova_adresse', adresse);
    if (recordId) sessionStorage.setItem('prova_record_id', recordId);
    // Banner aktualisieren
    var existing = document.getElementById('prova-fall-kontext-banner');
    if (existing) existing.remove();
    einfuegenBanner();
  },
  // Fall-Kontext löschen (nach Archivierung)
  clearFall: function() {
    localStorage.removeItem('prova_letztes_az');
    localStorage.removeItem('prova_schadenart');
    localStorage.removeItem('prova_adresse');
    sessionStorage.removeItem('prova_record_id');
    sessionStorage.removeItem('prova_fall_id');
  }
};
})();