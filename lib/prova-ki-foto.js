/* ════════════════════════════════════════════════════════════════════
   PROVA KI-Foto-Caption (Vision) — MEGA⁸⁴ Block A.3
   ════════════════════════════════════════════════════════════════════
   Wrapper für ki-proxy task='foto_caption_vision' (gpt-5.5-vision).
   Liefert sachliche Foto-Beschreibung + §-Zuordnung-Vorschlag.

   API:
     await window.ProvaKiFoto.generateCaption({
       imageFile: <File> | imageBase64: <string>,
       context?: '<Kontext-Hint, z.B. Schadens-Art>'
     })
   Returnt: { caption, paragraph_suggestion, confidence }
═════════════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  async function _fileToBase64(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function _getToken(){
    try {
      var mod = await import('/lib/supabase-client.js');
      var sb = mod.supabase || (mod.getSupabase && mod.getSupabase());
      if (!sb) return null;
      var { data: { session } } = await sb.auth.getSession();
      return session && session.access_token ? session.access_token : null;
    } catch(_){ return null; }
  }

  async function generateCaption(opts){
    opts = opts || {};
    var imageBase64 = opts.imageBase64;
    if (!imageBase64 && opts.imageFile) {
      imageBase64 = await _fileToBase64(opts.imageFile);
    }
    if (!imageBase64) throw new Error('imageFile oder imageBase64 erforderlich');

    var tok = await _getToken();
    if (!tok) throw new Error('Keine Anmeldung');

    var url = (window.PROVA_CONFIG && window.PROVA_CONFIG.SUPABASE_URL || '').replace(/\/$/, '');
    var res = await fetch(url + '/functions/v1/ki-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({
        purpose: 'foto_caption_vision',
        prompt: opts.context || '',
        image_base64: imageBase64,
        max_tokens: 500
      })
    });
    if (!res.ok) {
      var errText = await res.text();
      throw new Error('Vision-Call fehlgeschlagen: ' + res.status + ' ' + errText.slice(0,200));
    }
    var json = await res.json();
    var text = json.output || json.text || '';
    // JSON-Output parsen (Prompt verlangt JSON ohne Code-Fence)
    try {
      // Defensive: Code-Fence entfernen falls KI doch markdown returnt
      text = text.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
      var parsed = JSON.parse(text);
      return {
        caption: parsed.caption || '',
        paragraph_suggestion: parsed.paragraph_suggestion || '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        raw: text
      };
    } catch(e){
      console.warn('[ProvaKiFoto] JSON-Parse failed, fallback to raw text', e);
      return { caption: text, paragraph_suggestion: '', confidence: 0.0, raw: text };
    }
  }

  global.ProvaKiFoto = { generateCaption: generateCaption };
})(typeof window !== 'undefined' ? window : globalThis);
