// server.js
// Servidor que conecta el chatbot de derecho a Facebook Messenger.
// Meta (Facebook) envía los mensajes aquí vía webhook, y este servidor responde.

const express = require('express');
const app = express();
app.use(express.json());

// ----------------------------------------------------------------
// CONFIGURACIÓN — pon estos valores como variables de entorno
// (nunca los escribas directamente aquí si vas a subir el código a GitHub)
// ----------------------------------------------------------------
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;       // Tú lo inventas, ej: "mi_token_secreto_123"
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Solo si usas Messenger
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;   // Solo si usas WhatsApp
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;   // Opcional: si quieres respuestas con IA
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ----------------------------------------------------------------
// BASE DE CONOCIMIENTO (misma lógica del chatbot en HTML)
// ----------------------------------------------------------------
const rules = [
  { keys: ['hola', 'buenas', 'hey', 'que tal'],
    responses: ['¡Hola! Soy tu apoyo de estudio en derecho. Pregúntame por un concepto, o escribe "temas" para ver el índice.'] },
  { keys: ['temas', 'ayuda', 'help', 'indice', 'índice'],
    responses: [`Puedo explicarte, entre otros:
• Ramas del derecho
• Fuentes del derecho
• Jerarquía normativa
• Persona natural / jurídica
• Dolo, culpa y responsabilidad civil
• Contratos
• Jurisdicción y competencia
• Jurisprudencia y doctrina

Escribe cualquiera de esos términos.`] },
  { keys: ['derecho civil'],
    responses: ['El Derecho Civil regula las relaciones jurídicas entre particulares: personas, familia, bienes, obligaciones, contratos y sucesiones.'] },
  { keys: ['derecho penal'],
    responses: ['El Derecho Penal define qué conductas son delitos y establece las penas. Su principio central es la tipicidad: no hay delito ni pena sin ley previa.'] },
  { keys: ['dolo'],
    responses: ['El dolo es la intención positiva de causar un daño o de engañar a otra persona para obtener un beneficio.'] },
  { keys: ['culpa'],
    responses: ['La culpa es la falta de diligencia o cuidado que causa un daño, sin intención de causarlo.'] },
  { keys: ['contrato'],
    responses: ['Un contrato es un acuerdo de voluntades entre dos o más partes que crea, modifica o extingue obligaciones. Elementos esenciales: consentimiento, objeto y causa lícita.'] },
  { keys: ['jurisprudencia'],
    responses: ['La jurisprudencia es el conjunto de decisiones de los tribunales que sirven como criterio interpretativo del derecho.'] },
  { keys: ['gracias'],
    responses: ['¡De nada! Sigue preguntando por otro concepto cuando quieras.'] },
];

const fallback = [
  'No tengo ese concepto en mi base todavía. Escribe "temas" para ver el índice.',
  'No estoy seguro de haber entendido. ¿Puedes usar el término jurídico exacto?'
];

function findLocalResponse(text) {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (rule.keys.some(k => lower.includes(k))) {
      const options = rule.responses;
      return options[Math.floor(Math.random() * options.length)];
    }
  }
  return fallback[Math.floor(Math.random() * fallback.length)];
}

// ----------------------------------------------------------------
// (Opcional) Respuesta con Gemini si configuraste GEMINI_API_KEY
// ----------------------------------------------------------------
const SYSTEM_INSTRUCTION = `Eres un asistente de estudio para estudiantes de derecho, en español.
Explicas conceptos jurídicos de forma clara, breve (máximo 4-5 líneas, esto es un chat de Messenger) y didáctica.
Aclara que ofreces contenido general de estudio, no asesoría legal para un caso real.`;

async function askGemini(userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || 'No obtuve respuesta.';
}

async function generateReply(userText) {
  if (GEMINI_API_KEY) {
    try {
      return await askGemini(userText);
    } catch (err) {
      console.error('Error con Gemini, usando modo local:', err.message);
      return findLocalResponse(userText);
    }
  }
  return findLocalResponse(userText);
}

// ----------------------------------------------------------------
// 1) VERIFICACIÓN DEL WEBHOOK (Meta llama esto una sola vez al configurar)
// ----------------------------------------------------------------
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado correctamente.');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ----------------------------------------------------------------
// 2) RECEPCIÓN DE MENSAJES
//    Facebook Messenger y WhatsApp usan estructuras distintas de JSON,
//    así que detectamos cuál es y respondemos con la función correcta.
// ----------------------------------------------------------------
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // --- Mensajes de Facebook Messenger ---
  if (body.object === 'page') {
    for (const entry of body.entry) {
      const event = entry.messaging?.[0];
      if (event && event.message && event.message.text) {
        const senderId = event.sender.id;
        const userText = event.message.text;
        const reply = await generateReply(userText);
        await sendMessengerMessage(senderId, reply);
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  }

  // --- Mensajes de WhatsApp ---
  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry) {
      const changes = entry.changes?.[0];
      const messages = changes?.value?.messages;
      if (messages && messages.length > 0) {
        const message = messages[0];
        const from = message.from; // número del usuario
        const phoneNumberId = changes.value.metadata.phone_number_id;
        if (message.text) {
          const userText = message.text.body;
          const reply = await generateReply(userText);
          await sendWhatsAppMessage(phoneNumberId, from, reply);
        }
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  }

  res.sendStatus(404);
});

// ----------------------------------------------------------------
// Enviar respuesta por Facebook Messenger
// ----------------------------------------------------------------
async function sendMessengerMessage(recipientId, text) {
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text }
    })
  });
}

// ----------------------------------------------------------------
// Enviar respuesta por WhatsApp
// ----------------------------------------------------------------
async function sendWhatsAppMessage(phoneNumberId, to, text) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      text: { body: text }
    })
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
