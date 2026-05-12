/* ============================================================
   PROVA — Pseudonymize Helper (DRY)
   MEGA⁶³ Item 1.8 — konsolidiert aus ki-proxy + whisper-diktat.
   Regel 17: Pseudonymisierung VOR jeder OpenAI-Uebertragung.
   ============================================================ */

export type PseudoMap = Record<string, string>;

/**
 * Pseudonymisiert sensible Daten vor externem KI-Call.
 * Coverage:
 *   - Aktenzeichen (PROVA-Pattern + freie Form)
 *   - Email-Adressen
 *   - IBAN (DE + intl)
 *   - Telefon (DE + intl)
 *   - URLs mit Personenbezug (TODO)
 *   - Namen / Adressen (TODO K-2 via NER)
 */
export function pseudonymize(text: string): { pseudo: string; map: PseudoMap } {
    const map: PseudoMap = {};
    let pseudo = text ?? '';
    let i: number;

    // Aktenzeichen: PROVA-Pattern (SCH-YYYY-NNN) + freie Form (z.B. 12 O 345/26)
    i = 0;
    pseudo = pseudo.replace(
        /\b([A-ZÄÖÜ]{2,4}-\d{4}-\d{2,5}|\d{1,3}\s*[A-Z]\s*\d{1,4}\/\d{2,4})\b/g,
        (m) => { i += 1; const t = `[AZ-${i}]`; map[t] = m; return t; }
    );

    // Emails
    i = 0;
    pseudo = pseudo.replace(
        /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g,
        (m) => { i += 1; const t = `[EMAIL-${i}]`; map[t] = m; return t; }
    );

    // IBAN (DE + intl, vereinfacht)
    i = 0;
    pseudo = pseudo.replace(
        /\b[A-Z]{2}\d{2}\s?(?:\d{4}\s?){4,7}\d{0,4}\b/g,
        (m) => { i += 1; const t = `[IBAN-${i}]`; map[t] = m; return t; }
    );

    // Telefon DE (best-effort, conservative)
    i = 0;
    pseudo = pseudo.replace(
        /\b(?:\+49|0049|0)\s?\d{2,5}[\s\-/]?\d{4,12}\b/g,
        (m) => { i += 1; const t = `[TEL-${i}]`; map[t] = m; return t; }
    );

    return { pseudo, map };
}

/**
 * Re-Identifiziert pseudonymisierte Tokens im KI-Output.
 */
export function reidentify(text: string, map: PseudoMap): string {
    if (!text) return text;
    let out = text;
    for (const [token, original] of Object.entries(map)) {
        out = out.split(token).join(original);
    }
    return out;
}

/**
 * SHA-256 Hash fuer Input-Tracking (Cache-Key + Audit-Hash).
 */
export async function sha256Hex(input: string): Promise<string> {
    const buf = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
