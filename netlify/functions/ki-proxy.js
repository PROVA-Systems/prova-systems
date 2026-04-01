// PROVA Systems — KI-Proxy Netlify Function
// Löst CORS: Browser → /.netlify/functions/ki-proxy → OpenAI API
// API-Key liegt sicher in Netlify Env Var OPENAI_API_KEY

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // OpenAI Chat Completions Format aufbauen
  // Eingehend: { model, max_tokens, messages: [{role, content: [{type,text},{type,image,source}]}] }
  // Anthropic-Format → OpenAI-Format konvertieren
  try {
    const messages = (body.messages || []).map(msg => {
      if (!Array.isArray(msg.content)) return msg;
      // Konvertiere Anthropic content array → OpenAI content array
      const content = msg.content.map(part => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        }
        if (part.type === 'image' && part.source) {
          // Anthropic: { type: 'image', source: { type: 'base64', media_type, data } }
          // OpenAI:    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }
          return {
            type: 'image_url',
            image_url: {
              url: 'data:' + part.source.media_type + ';base64,' + part.source.data,
              detail: 'low'  // 'low' = günstig, reicht für Beschriftungen
            }
          };
        }
        return part;
      });
      return { role: msg.role, content };
    });

    // Modell-Mapping: Anthropic → OpenAI
    let model = body.model || 'gpt-4o-mini';
    if (model.includes('haiku') || model.includes('sonnet') || model.includes('opus')) {
      model = 'gpt-4o-mini';  // Alle Haiku/Sonnet → gpt-4o-mini
    }

    const openaiBody = {
      model: model,
      max_tokens: body.max_tokens || 500,
      messages: messages
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(openaiBody)
    });

    const data = await response.json();

    // OpenAI-Antwort → Anthropic-Format konvertieren
    // OpenAI: { choices: [{ message: { content: "text" } }] }
    // Anthropic: { content: [{ type: "text", text: "text" }] }
    let anthropicFormat = data;
    if (data.choices && data.choices[0] && data.choices[0].message) {
      anthropicFormat = {
        content: [{ type: 'text', text: data.choices[0].message.content || '' }],
        model: data.model,
        usage: data.usage
      };
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(anthropicFormat)
    };

  } catch (e) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Upstream error', detail: e.message })
    };
  }
};
