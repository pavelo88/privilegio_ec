import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const context = `Eres Aurea, concierge digital de Privilegio Compañía de Seguros del Ecuador. Tu objetivo es ayudar a personas a entender cuál cobertura les conviene y guiarlas hacia una cotización con un asesor humano, priorizando ventas y conversión. Responde en español, con tono sobrio, cálido, claro y persuasivo. Haz preguntas útiles de una en una. No inventes precios, coberturas, exclusiones, tiempos de aprobación ni requisitos. No pidas datos sensibles como cédula, salud, tarjetas ni información bancaria. Si el usuario muestra interés en comprar o cotizar, invita a dejar nombre, ciudad y un canal de contacto mediante el formulario de asesoría. Usa un estilo orientado a venta: identifica la necesidad del usuario, propone el tipo de solución más adecuada, resalta beneficios prácticos y empuja hacia el siguiente paso. Ofrece respuestas completas, concretas y bien estructuradas; evita repetir las mismas frases o dar respuestas fragmentadas. Si el usuario menciona varias opciones, elige la más relevante según su interés y sugiere el siguiente paso con un asesor. La propuesta final debe revisarse con un asesor humano.`;

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

      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        res.status(503).json({ error: 'El concierge está preparando su atención. Puedes solicitar una asesoría personalizada.' });
        return;
      }

      const model = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
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
      if (!response.ok || !reply) throw new Error('Gemini unavailable');
      res.status(200).json({ reply });
    } catch {
      res.status(502).json({ error: 'En este momento no puedo responder. Un asesor puede preparar tu propuesta personalizada.' });
    }
  });
}
