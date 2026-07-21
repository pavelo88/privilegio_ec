import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const context = `Eres Aurea, concierge digital de Privilegio Compañía de Seguros del Ecuador. Tu objetivo es ayudar a personas a entender cuál cobertura les conviene y guiarlas hacia una cotización con un asesor humano, priorizando ventas y conversión. Responde en español, con tono sobrio, cálido, claro y persuasivo. Haz preguntas útiles de una en una. No inventes precios, coberturas, exclusiones, tiempos de aprobación ni requisitos. No pidas datos sensibles como cédula, salud, tarjetas ni información bancaria. Si el usuario muestra interés en comprar o cotizar, invita a dejar nombre, ciudad y un canal de contacto mediante el formulario de asesoría. Usa un estilo orientado a venta: identifica la necesidad del usuario, propone el tipo de solución más adecuada, resalta beneficios prácticos y empuja hacia el siguiente paso. Ofrece respuestas completas, concretas y bien estructuradas; evita repetir las mismas frases o dar respuestas fragmentadas. Si el usuario menciona varias opciones, elige la más relevante según su interés y sugiere el siguiente paso con un asesor. La propuesta final debe revisarse con un asesor humano.`;

function parseGroqResponse(data) {
  const result = [];
  if (Array.isArray(data.output)) {
    for (const outputItem of data.output) {
      if (Array.isArray(outputItem.content)) {
        for (const part of outputItem.content) {
          if (typeof part?.text === 'string') result.push(part.text);
        }
      }
    }
  }
  if (!result.length && typeof data.output_text === 'string') {
    result.push(data.output_text);
  }
  return result.join('').trim();
}

async function generateWithGroq(message) {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) throw new Error('No Groq API key');

  const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b';
  const response = await fetch('https://api.groq.com/openai/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`
    },
    body: JSON.stringify({
      model,
      input: message,
      temperature: 0.45,
      max_output_tokens: 220
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const reply = parseGroqResponse(data);
  if (!reply) throw new Error('Groq returned empty reply');
  return reply;
}

async function generateWithGemini(message) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) throw new Error('No Gemini API key');

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: context }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.45, maxOutputTokens: 220 }
    })
  });

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!response.ok || !reply) {
    const text = JSON.stringify(data);
    throw new Error(`Gemini request failed (${response.status}): ${text}`);
  }
  return reply;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido.' });
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 4000) {
      res.status(413).json({ error: 'Consulta demasiado extensa.' });
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      const { message } = JSON.parse(body);
      if (!message?.trim()) {
        res.status(400).json({ error: 'Escribe una consulta de hasta 1.400 caracteres.' });
        return;
      }

      const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());
      const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
      if (!hasGroq && !hasGemini) {
        res.status(503).json({ error: 'El concierge está preparando su atención. Puedes solicitar una asesoría personalizada.' });
        return;
      }

      let reply;
      try {
        if (hasGroq) reply = await generateWithGroq(message);
        else throw new Error('Groq no disponible');
      } catch (groqError) {
        console.error('Groq fallback:', groqError.message || groqError);
        if (!hasGemini) throw groqError;
        reply = await generateWithGemini(message);
      }

      res.status(200).json({ reply });
    } catch (error) {
      console.error('Concierge error:', error?.message || error);
      res.status(502).json({ error: 'En este momento no puedo responder. Un asesor puede preparar tu propuesta personalizada.' });
    }
  });
}
