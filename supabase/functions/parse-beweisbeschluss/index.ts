/* PROVA Edge — parse-beweisbeschluss (Welle 7)
   DEFERRED: Deno-Edge unterstützt pdf-parse (Node-spezifisch) nicht zuverlässig.
   Stub gibt 501 zurück mit Migrations-Hinweis. Frontend fällt auf manuelles Eingeben zurück.
*/
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  return J({
    error: 'PDF-Parse-Funktion temporär deaktiviert',
    code: 'DEFERRED',
    detail: 'pdf-parse ist Node-spezifisch und in Deno Edge nicht direkt nutzbar. Migration auf KI-OCR via ki-proxy + Vision-Model geplant für nach Pilot-Start.',
    fallback: 'Bitte Beweisbeschluss-Daten manuell eingeben oder als JSON-Body übergeben.'
  }, 501);
});
