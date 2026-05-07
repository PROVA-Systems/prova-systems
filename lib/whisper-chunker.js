/**
 * lib/whisper-chunker.js — MEGA³² D1 Whisper-Chunker für >25MB Audio
 *
 * OpenAI Whisper API hat 25MB-Limit pro Request. Bei langen Diktaten
 * (>~20 Min in webm-opus) muss client-side gechunkt werden.
 *
 * Strategie A — Recording-Time-Chunks (saubere Lösung):
 *   MediaRecorder mit timeslice-Restart alle CHUNK_DURATION_SEC.
 *   Jeder Chunk = eigener WebM-Container → unabhängig dekodierbar.
 *
 * Strategie B — Post-Hoc-Chunks (Fallback wenn schon aufgenommen):
 *   Blob.slice() funktioniert NICHT sauber für komprimierte Formate.
 *   Statt-dessen: AudioContext.decodeAudioData → split → encode-back.
 *   Schwergewichtig (FFmpeg-WASM ~30MB) — daher in PROVA Pilot nur
 *   Strategie A aktiv. Strategie B als Empfehlung-API für User-Hinweis.
 *
 * Pseudonymisierung-Coverage:
 *   whisper-diktat.js läuft pro Chunk und pseudonymisiert das Transkript.
 *   Beim Konkatenieren mehrerer Chunks bleibt jeder einzelne pseudonymisiert.
 *   KEINE Klardaten passieren den Server-Output je. (Regel 17)
 *
 * UMD-Pattern für Browser + Node-Tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WhisperChunker = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_CHUNK_BYTES = 20 * 1024 * 1024; // 20MB Sicherheits-Buffer (Whisper 25MB hard-cap)
  const CHUNK_DURATION_SEC = 240; // 4 Min Chunks (~6MB bei opus@32kbps mono)
  const RECOMMENDED_BITRATE_KBPS = 32; // opus mono Stimme

  /**
   * estimateChunkCount(blob): wieviele Chunks nötig?
   */
  function estimateChunkCount(blob) {
    if (!blob || !blob.size) return 1;
    return Math.max(1, Math.ceil(blob.size / MAX_CHUNK_BYTES));
  }

  /**
   * estimateMaxDurationSec(): bei aktuellem Bitrate, wie lang darf ein Chunk sein?
   */
  function estimateMaxDurationSec() {
    // 25MB / (32kbps / 8) = 25*1024 / 4 = 6553 Sekunden ~ 109 Min theoretisch
    // Aber Container-Overhead + Stereo-Risiko → Sicherheits-Faktor 0.6
    return Math.floor((MAX_CHUNK_BYTES * 8) / (RECOMMENDED_BITRATE_KBPS * 1024) * 0.6);
  }

  /**
   * RecordingChunker — Time-Based-MediaRecorder-Restart-Pattern
   *
   * Usage:
   *   const chunker = new RecordingChunker(stream, { onChunk: (blob, idx) => {...} });
   *   chunker.start();
   *   ... (irgendwann)
   *   chunker.stop();  // letzten Chunk emittieren
   *
   * Jeder onChunk-Callback ist ein vollständiges WebM-Audio-File.
   */
  function RecordingChunker(stream, opts) {
    this.stream = stream;
    this.opts = opts || {};
    this.chunkDurationSec = this.opts.chunkDurationSec || CHUNK_DURATION_SEC;
    this.mimeType = this.opts.mimeType || 'audio/webm;codecs=opus';
    this.chunks = [];
    this.idx = 0;
    this._recorder = null;
    this._timer = null;
    this._currentBlobs = [];
    this._stopped = false;
  }

  RecordingChunker.prototype._startRecorder = function () {
    if (this._stopped) return;
    if (typeof MediaRecorder === 'undefined') return; // Test-Env
    this._currentBlobs = [];
    this._recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this._recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this._currentBlobs.push(e.data);
    };
    this._recorder.onstop = () => {
      const blob = new Blob(this._currentBlobs, { type: this.mimeType });
      this.idx++;
      this.chunks.push(blob);
      if (typeof this.opts.onChunk === 'function') this.opts.onChunk(blob, this.idx);
      if (!this._stopped) this._startRecorder();
    };
    this._recorder.start();
    this._timer = setTimeout(() => {
      try { this._recorder.stop(); } catch (e) { /* ignore */ }
    }, this.chunkDurationSec * 1000);
  };

  RecordingChunker.prototype.start = function () {
    this._stopped = false;
    this._startRecorder();
  };

  RecordingChunker.prototype.stop = function () {
    this._stopped = true;
    if (this._timer) clearTimeout(this._timer);
    if (this._recorder && this._recorder.state !== 'inactive') {
      try { this._recorder.stop(); } catch (e) { /* ignore */ }
    }
  };

  /**
   * transcribeAndJoin(chunks, opts) — konkateniert Transkripte sequenziell.
   * Pro Chunk: separater Whisper-Call → server-side pseudonymisiert → join.
   */
  async function transcribeAndJoin(chunks, opts) {
    const { fetchImpl, onProgress, sprache, schadenart } = opts || {};
    const fetcher = fetchImpl || (typeof window !== 'undefined' && window.provaFetch) || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) throw new Error('no-fetch');

    const transkripte = [];
    for (let i = 0; i < chunks.length; i++) {
      const blob = chunks[i];
      // Base64-Encode wie whisper-diktat.js erwartet
      const buf = await blob.arrayBuffer();
      const b64 = typeof Buffer !== 'undefined'
        ? Buffer.from(buf).toString('base64')
        : btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));

      const res = await fetcher('/.netlify/functions/whisper-diktat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: b64,
          mediaType: blob.type || 'audio/webm',
          sprache: sprache || 'de-DE',
          schadenart: schadenart || '',
        }),
      });

      if (!res.ok) {
        if (typeof onProgress === 'function') onProgress({ done: i + 1, total: chunks.length, error: 'http-' + res.status });
        continue;
      }
      const data = await res.json();
      transkripte.push((data.transkript || '').trim());
      if (typeof onProgress === 'function') onProgress({ done: i + 1, total: chunks.length });
    }
    // Konkatenation mit Absatz-Trenner zwischen Chunks (Whisper splittet sonst Sätze)
    return transkripte.filter(Boolean).join('\n\n');
  }

  /**
   * shouldChunk(blob): user-facing Hinweis-Function
   */
  function shouldChunk(blob) {
    return !!(blob && blob.size && blob.size > MAX_CHUNK_BYTES);
  }

  return {
    MAX_CHUNK_BYTES,
    CHUNK_DURATION_SEC,
    RECOMMENDED_BITRATE_KBPS,
    estimateChunkCount,
    estimateMaxDurationSec,
    RecordingChunker,
    transcribeAndJoin,
    shouldChunk,
  };
});
