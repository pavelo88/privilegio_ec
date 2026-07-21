import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

async function loadEnv() {
  try {
    const envContent = await readFile(join(process.cwd(), '.env'), 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // El archivo .env es opcional; si no existe, el servidor sigue con variables de entorno del sistema.
  }
}

await loadEnv();

const port = Number(process.env.PORT || 3000);
const publicDir = join(process.cwd(), 'public');
const mime = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.html': 'text/html; charset=utf-8' };
const context = `Eres Aurea, concierge digital de Privilegio Compañía de Seguros del Ecuador. Tu objetivo es ayudar a personas a entender cuál cobertura les conviene y guiarlas hacia una cotización con un asesor humano, priorizando ventas y conversión. Responde en español, con tono sobrio, cálido, claro y persuasivo. Haz preguntas útiles de una en una. No inventes precios, coberturas, exclusiones, tiempos de aprobación ni requisitos. No pidas datos sensibles como cédula, salud, tarjetas ni información bancaria. Si el usuario muestra interés en comprar o cotizar, invita a dejar nombre, ciudad y un canal de contacto mediante el formulario de asesoría. Usa un estilo orientado a venta: identifica la necesidad del usuario, propone el tipo de solución más adecuada, resalta beneficios prácticos y empuja hacia el siguiente paso. Mantén respuestas breves, máximas 90 palabras. Siempre recuerda que la propuesta final debe revisarse con un asesor humano.`;

function send(res, code, content, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  res.end(Buffer.isBuffer(content) || typeof content === 'string' ? content : JSON.stringify(content));
}

async function concierge(req, res) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 4000) return send(res, 413, { error: 'Consulta demasiado extensa.' }); }
  let message;
  try { message = JSON.parse(body).message?.trim(); } catch { return send(res, 400, { error: 'Formato de consulta inválido.' }); }
  if (!message || message.length > 1400) return send(res, 400, { error: 'Escribe una consulta de hasta 1.400 caracteres.' });
  if (!process.env.GEMINI_API_KEY) return send(res, 503, { error: 'El concierge está preparando su atención. Puedes solicitar una asesoría personalizada.' });
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: context }] }, contents: [{ role: 'user', parts: [{ text: message }] }], generationConfig: { temperature: 0.45, maxOutputTokens: 220 } })
    });
    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!response.ok || !reply) throw new Error('Gemini unavailable');
    send(res, 200, { reply });
  } catch {
    send(res, 502, { error: 'En este momento no puedo responder. Un asesor puede preparar tu propuesta personalizada.' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'POST' && url.pathname === '/api/concierge') return concierge(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Método no permitido.' });
  const wanted = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^([.]{2}[\\/])+/, '');
  try { const file = await readFile(join(publicDir, wanted)); send(res, 200, file, mime[extname(wanted)] || 'application/octet-stream'); }
  catch { send(res, 404, 'No encontrado', 'text/plain; charset=utf-8'); }
});
server.listen(port, () => console.log(`Privilegio en http://localhost:${port}`));
