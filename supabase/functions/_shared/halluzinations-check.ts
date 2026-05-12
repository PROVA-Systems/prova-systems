/* ============================================================
   PROVA — Halluzinations-Check (Substring + Pattern)
   MEGA⁶³ Item 1.8 — Regel 10 HALLUZINATIONSVERBOT.
   KI darf nichts erfinden — nur das wiedergeben was im Input stand.
   ============================================================ */

/**
 * Check ob KI-Output-Text als Substring im Original-Input vorkommt
 * (mit Whitespace-Normalisierung + case-insensitive).
 *
 * Use-Case: Audio-Chunking. Whisper-Transkript wird in 2-3-Satz-Chunks
 * geschnitten; jedes Chunk-Text MUSS im Original vorkommen, sonst hat
 * die KI eigene Worte erfunden.
 */
export function isSubstringOf(needle: string, haystack: string): boolean {
    if (!needle || !haystack) return false;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    return norm(haystack).includes(norm(needle));
}

/**
 * Check ob KI-Output keine subjektivierenden Phrasen enthaelt.
 * Verbotene Pattern: "ich sehe", "meiner Meinung", "ich glaube".
 * Use-Case: Vision-Captions sollen objektiv sein.
 */
const SUBJEKTIV_PATTERN = /\b(ich\s+(sehe|denke|glaube|meine|finde)|meine[rsn]?\s+(meinung|ansicht)|aus\s+meiner\s+sicht)/i;

export function hasSubjektivierung(text: string): boolean {
    return SUBJEKTIV_PATTERN.test(text);
}

/**
 * Check ob KI-Output bewertende Phrasen enthaelt (verboten in Befund).
 * Pattern: "dies ist gefaehrlich", "kritisch", "schwerwiegend".
 */
const BEWERTUNG_PATTERN = /\b(gef[äa]hrlich|kritisch|schwerwiegend|katastrophal|verheerend|unmoegli?ch)\b/i;

export function hasBewertung(text: string): boolean {
    return BEWERTUNG_PATTERN.test(text);
}

/**
 * Check ob KI-Output Konjunktiv II nutzt (bei Unsicherheits-Aussagen).
 * Indikatoren: "wuerde", "duerfte", "koennte", "liegt nahe dass".
 */
const KONJUNKTIV_PATTERN = /\b(w[üu]rde|d[üu]rfte|k[öo]nnte|liegt\s+nahe\s+dass|ist\s+anzunehmen|deutet\s+darauf\s+hin)\b/i;

export function hasKonjunktiv(text: string): boolean {
    return KONJUNKTIV_PATTERN.test(text);
}

/**
 * Aggregierter Check fuer Audio-Chunks: jedes Chunk-Text muss
 * Substring vom Transkript sein.
 */
export function checkAudioChunks(chunks: Array<{ text: string }>, transkript: string): {
    passed: boolean;
    failed_chunks: number[];
} {
    const failed: number[] = [];
    for (let i = 0; i < chunks.length; i++) {
        if (!isSubstringOf(chunks[i].text, transkript)) failed.push(i);
    }
    return { passed: failed.length === 0, failed_chunks: failed };
}

/**
 * Aggregierter Check fuer Vision-Captions: keine Subjektivierung + keine Bewertung.
 */
export function checkVisionCaption(text: string): {
    passed: boolean;
    issues: string[];
} {
    const issues: string[] = [];
    if (hasSubjektivierung(text)) issues.push('subjektivierung');
    if (hasBewertung(text)) issues.push('bewertung');
    return { passed: issues.length === 0, issues };
}
