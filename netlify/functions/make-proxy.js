/**
 * PROVA — Server-Proxy zu Make.com (Webhooks nur in Env, nie im Frontend)
 * Keys: k3 (intern secret), a5 (JWT), f1|g3|l8|s1 (JWT)
 * Env: MAKE_WEBHOOK_K3, MAKE_WEBHOOK_A5, MAKE_WEBHOOK_F1, MAKE_WEBHOOK_G3, MAKE_WEBHOOK_L8, MAKE_WEBHOOK_S1
 */
function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-prova-internal, X-Prova-Internal',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(obj)
  };
}

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-prova-internal, X-Prova-Internal',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const key = (event.queryStringParameters && event.queryStringParameters.key) || '';
  if (key !== 'k3' && key !== 'a5' && key !== 'f1' && key !== 'g3' && key !== 'l8' && key !== 's1') {
    return json(400, { error: 'Ungültiger key' });
  }

  if (key === 'k3') {
    const internal = (event.headers['x-prova-internal'] || event.headers['X-Prova-Internal'] || '').trim();
    const secret = process.env.PROVA_INTERNAL_WRITE_SECRET || '';
    if (!secret || internal !== secret) {
      return json(403, { error: 'Verboten' });
    }
  }
  if (key === 'a5') {
    const user = context.clientContext && context.clientContext.user;
    if (!user || !user.email) {
      return json(401, { error: 'Anmeldung erforderlich' });
    }
  }
  if (key === 'f1' || key === 'g3' || key === 'l8' || key === 's1') {
    const user = context.clientContext && context.clientContext.user;
    if (!user || !user.email) {
      return json(401, { error: 'Anmeldung erforderlich' });
    }
  }

  var webhook = '';
  if (key === 'a5') webhook = process.env.MAKE_WEBHOOK_A5 || '';
  else if (key === 'k3') webhook = process.env.MAKE_WEBHOOK_K3 || '';
  else if (key === 'f1') webhook = process.env.MAKE_WEBHOOK_F1 || '';
  else if (key === 'g3') webhook = process.env.MAKE_WEBHOOK_G3 || '';
  else if (key === 'l8') webhook = process.env.MAKE_WEBHOOK_L8 || '';
  else if (key === 's1') webhook = process.env.MAKE_WEBHOOK_S1 || '';
  if (!webhook) {
    return json(200, { ok: true, skipped: true });
  }

  let body = event.body || '{}';
  try {
    JSON.parse(body);
  } catch (e) {
    body = '{}';
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
    return json(200, { ok: true, forwardStatus: res.status });
  } catch (err) {
    return json(200, { ok: true, forwardError: String(err && err.message ? err.message : err) });
  }
};
