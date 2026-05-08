# MEGA³⁴ A4 — iCal-Export Sources

**Datum:** 2026-05-07

## Recherche-Quellen (≥5)

| # | Quelle | Inhalt |
|---|---|---|
| 1 | **RFC 5545 (iCalendar Core)** | Pflicht-Properties: BEGIN:VCALENDAR, PRODID, VERSION, BEGIN:VEVENT, UID, DTSTAMP, DTSTART |
| 2 | **RFC 5545 § 3.6.1 VEVENT** | Event-Component mit DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION |
| 3 | **RFC 5545 § 3.7.3 PRODID** | Identifier: `-//PROVA Systems//SV-Termine 1.0//DE` |
| 4 | **RFC 5546 (iTIP)** | Subscribe-URL als REQUEST/PUBLISH-Method |
| 5 | **CalDAV vs Subscribe-URL** | CalDAV = bidirektional (komplex); Subscribe-URL = read-only (simpel, ausreichend) |
| 6 | **Google Calendar Subscribe** | `https://calendar.google.com/calendar/r?cid=<URL>` Auto-Subscribe-Link |
| 7 | **Apple Calendar Subscribe** | `webcal://<host>/path.ics` öffnet automatisch Kalender-Subscribe-Dialog |
| 8 | **Outlook Subscribe** | Direct .ics-URL, Refresh-Intervall im Calendar-Properties einstellbar |
| 9 | **Signed-Token-Pattern** | URL ohne Auth-Header braucht Token im Query (HMAC + Expiry) |
| 10 | **DSGVO Art. 32 — Calendar-Privacy** | Token = pseudonyme ID, Revocable, kein Klardaten in URL |

## Pflicht-Properties pro VEVENT

```
BEGIN:VEVENT
UID:<uuid>@prova-systems.de
DTSTAMP:20260507T140000Z
DTSTART:20260510T100000Z
DTEND:20260510T120000Z
SUMMARY:Ortstermin Mustergasse 12
DESCRIPTION:AZ TEST-001\nSchadensgutachten
LOCATION:Mustergasse 12\, 10115 Berlin
END:VEVENT
```

## RFC 5545 Escape-Regeln

- `\,` für Komma in Werten
- `\;` für Semikolon
- `\n` für Line-Break in DESCRIPTION
- `\\` für Backslash
- Zeile-Wrap nach 75 Zeichen mit `<CRLF><SPACE>`

---

*Co-Authored-By Claude Opus 4.7 (1M context)*
