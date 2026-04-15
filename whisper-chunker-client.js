/**
 * PROVA Systems — Whisper Audio Chunker (Client-Seite)
 * ═══════════════════════════════════════════════════════════════════════
 * PROBLEM: Netlify Functions haben ein 6MB Request-Body Limit.
 *          Ein 30-Minuten-Diktat (WebM/Opus) = 3-15MB.
 *          Ein 60-Minuten-Diktat kann 25MB+ sein → Whisper-Limit.
 *
 * LÖSUNG: Audio-Blob wird client-seitig in Zeit-Segmente geteilt.
 *         Jeder Chunk wird separat an whisper-diktat.js gesendet.
 *         Server kombiniert Transkripte.
 *
 * EINBINDEN:
 *   <script src="whisper-chunker-client.js"></script>
 *
 * API:
 *   window.ProvaWhisperChunker.transkribiere(audioBlob, options)
 *     → Promise<{ transkript, dauer, qualitaet, worte, segmente }>
 *
 * OPTIONS:
 *   mediaType     string  'audio/webm' (default)
 *   sprache       string  'de' (default)
 *   schadenart    string  '' (für bessere Erkennung)
 *   prompt        string  '' (zusätzlicher Kontext)
 *   onProgress    fn      callback(percent, status)
 *   maxChunkMB    number  10 (MB pro Chunk, default)
 */

(function (window) {
  'use strict';

  var MAX_CHUNK_MB        = 10;             // 10MB pro Chunk → Base64 ~13MB → unter 15MB Limit
  var MAX_CHUNK_BYTES     = MAX_CHUNK_MB * 1024 * 1024;
  var CHUNK_DURATION_SEC  = 5 * 60;        // 5 Minuten pro Chunk (Ausgangspunkt)
  var WHISPER_URL         = '/.netlify/functions/whisper-diktat';

  // ══════════════════════════════════════════════════════════════
  // AUDIO BLOB IN CHUNKS AUFTEILEN
  // Verwendet Web Audio API um Audio in Zeitabschnitte zu teilen
  // ══════════════════════════════════════════════════════════════
  function blobToArrayBuffer(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Einfaches Byte-basiertes Splitting (für WebM/Opus, MP3 etc.)
   * Teilt den Blob in gleichmäßige Byte-Chunks auf.
   * Funktioniert auch ohne Web Audio API (kein PCM-Decode nötig).
   */
  function splitBlobByBytes(blob, maxBytes) {
    var chunks   = [];
    var offset   = 0;
    var size     = blob.size;

    while (offset < size) {
      var end = Math.min(offset + maxBytes, size);
      chunks.push(blob.slice(offset, end, blob.type));
      offset = end;
    }

    return chunks;
  }

  /**
   * Blob → Base64 String
   */
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result; // data:audio/webm;base64,xxxx
        resolve(dataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CHUNK SENDEN
  // ══════════════════════════════════════════════════════════════
  function sendChunk(base64Data, sessionId, chunkIndex, totalChunks, opts) {
    var payload = {
      audioBase64:  base64Data,
      mediaType:    opts.mediaType   || 'audio/webm',
      sprache:      opts.sprache     || 'de',
      schadenart:   opts.schadenart  || '',
      prompt:       opts.prompt      || '',
      session_id:   sessionId,
      chunk_index:  chunkIndex,
      total_chunks: totalChunks,
    };

    return fetch(WHISPER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () {
          return { error: 'HTTP ' + res.status };
        }).then(function (err) {
          throw new Error(err.error || 'Chunk ' + chunkIndex + ' fehlgeschlagen: HTTP ' + res.status);
        });
      }
      return res.json();
    });
  }

  // ══════════════════════════════════════════════════════════════
  // HAUPT-API: transkribiere()
  // ══════════════════════════════════════════════════════════════
  function transkribiere(audioBlob, opts) {
    opts = opts || {};
    var onProgress = opts.onProgress || function () {};

    return new Promise(function (resolve, reject) {
      // Kein Chunking nötig?
      if (audioBlob.size <= MAX_CHUNK_BYTES) {
        onProgress(10, 'Sende Audio an Whisper…');

        blobToBase64(audioBlob).then(function (base64) {
          onProgress(30, 'Transkribiere…');

          var payload = {
            audioBase64: base64,
            mediaType:   opts.mediaType  || audioBlob.type || 'audio/webm',
            sprache:     opts.sprache    || 'de',
            schadenart:  opts.schadenart || '',
            prompt:      opts.prompt     || '',
          };

          return fetch(WHISPER_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          });
        }).then(function (res) {
          if (!res.ok) {
            return res.json().catch(function () { return { error: 'HTTP ' + res.status }; })
              .then(function (err) { throw new Error(err.error || 'Transkription fehlgeschlagen'); });
          }
          return res.json();
        }).then(function (data) {
          onProgress(100, 'Fertig');
          resolve(data);
        }).catch(function (err) {
          reject(err);
        });

        return;
      }

      // ── Chunking benötigt ──────────────────────────────────────
      console.log('[WhisperChunker] Audio ' + Math.round(audioBlob.size / 1024 / 1024) + 'MB → Chunking aktiviert');
      onProgress(5, 'Teile Audio auf…');

      var chunks      = splitBlobByBytes(audioBlob, MAX_CHUNK_BYTES);
      var totalChunks = chunks.length;
      var sessionId   = 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

      console.log('[WhisperChunker] ' + totalChunks + ' Chunks à max ' + MAX_CHUNK_MB + 'MB');

      // Chunks sequenziell senden (nicht parallel — Whisper Rate-Limit)
      var chain     = Promise.resolve();
      var lastResult = null;

      chunks.forEach(function (chunk, idx) {
        chain = chain.then(function () {
          var progressBase = 10 + (idx / totalChunks) * 80;
          onProgress(Math.round(progressBase), 'Chunk ' + (idx + 1) + '/' + totalChunks + ' senden…');

          return blobToBase64(chunk).then(function (base64) {
            return sendChunk(base64, sessionId, idx, totalChunks, opts);
          }).then(function (result) {
            lastResult = result;
            var progressDone = 10 + ((idx + 1) / totalChunks) * 80;
            onProgress(Math.round(progressDone), 'Chunk ' + (idx + 1) + '/' + totalChunks + ' ✓');
            console.log('[WhisperChunker] Chunk ' + (idx + 1) + '/' + totalChunks + ' ✓');
            return result;
          });
        });
      });

      chain.then(function () {
        onProgress(95, 'Transkripte zusammenführen…');
        // Letztes Ergebnis ist die kombinierte Antwort (server-seitig)
        if (lastResult && lastResult.status === 'complete') {
          onProgress(100, 'Fertig ✓');
          resolve(lastResult);
        } else {
          reject(new Error('Transkription unvollständig — nicht alle Chunks empfangen'));
        }
      }).catch(function (err) {
        console.error('[WhisperChunker] Fehler:', err);
        reject(err);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // AUDIO DURATION HELPER (für UI-Anzeige)
  // ══════════════════════════════════════════════════════════════
  function getAudioDuration(blob) {
    return new Promise(function (resolve) {
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) { resolve(null); return; }

        var url    = URL.createObjectURL(blob);
        var audio  = new Audio();
        audio.src  = url;
        audio.addEventListener('loadedmetadata', function () {
          URL.revokeObjectURL(url);
          resolve(audio.duration);
        });
        audio.addEventListener('error', function () {
          URL.revokeObjectURL(url);
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * Prüft ob Chunking benötigt wird + gibt Infos zurück
   */
  function analysiereAudio(blob) {
    return getAudioDuration(blob).then(function (dauer) {
      var sizeMB      = blob.size / 1024 / 1024;
      var needsChunk  = blob.size > MAX_CHUNK_BYTES;
      var chunks      = needsChunk ? Math.ceil(blob.size / MAX_CHUNK_BYTES) : 1;

      return {
        sizeMB:      Math.round(sizeMB * 10) / 10,
        dauer:       dauer ? Math.round(dauer) : null,
        needsChunk,
        chunks,
        maxChunkMB:  MAX_CHUNK_MB,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════
  window.ProvaWhisperChunker = {
    transkribiere,
    analysiereAudio,
    MAX_CHUNK_MB,
  };

}(window));