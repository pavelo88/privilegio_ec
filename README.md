# Privilegio — experiencia digital premium

## Arquitectura

```text
public/                 Experiencia web estática: marca, animaciones y concierge UI
server.mjs              Servidor Node: entrega el sitio y protege la llamada de IA
api/concierge.js        API serverless para Vercel: proxy de Gemini con contexto comercial
POST /api/concierge     Proxy seguro de Gemini con reglas comerciales y de seguridad
.env                    Secretos locales (nunca se publican ni llegan al navegador)
```

## Flujo de venta con Aurea

Aurea, el concierge digital, está diseñado para:
1. Identificar la necesidad del usuario en una pregunta clara.
2. Proponer el tipo de cobertura más adecuado.
3. Resaltar beneficios y diferenciadores de Privilegio.
4. Guiar hacia una cotización formal con un asesor humano.
5. Capturar nombre, ciudad y canal de contacto.

La interfaz no conoce la clave de Gemini. El servidor añade el contexto comercial, limita el tamaño de las consultas y orienta al visitante hacia la conversión; no ofrece precios, contratos ni decisiones de cobertura.

## Ejecutar localmente

1. Copia `.env.example` como `.env`.
2. Añade tu clave real en `GEMINI_API_KEY`.
3. Ejecuta `npm start` y abre `http://localhost:3000`.

## Desplegar en Vercel

1. Conecta el repositorio de GitHub a Vercel.
2. En el panel de Vercel, añade estas variables de entorno:
   - `GROQ_API_KEY`: tu clave real de Groq.
   - `GROQ_MODEL`: `openai/gpt-oss-20b` (recomendado).
   - `GEMINI_API_KEY`: tu clave real de Google AI Studio, usada como respaldo.
   - `GEMINI_MODEL`: `gemini-flash-latest` (respaldo).
3. Vercel detectará automáticamente la ruta `/api/concierge.js` y la desplegará como serverless function.
4. La web se sirve estáticamente desde `public/`.

## Personalización antes de publicar

- Sustituye los enlaces de WhatsApp y correo de demostración por los canales oficiales.
- Conecta el formulario a CRM / HubSpot / Salesforce y añade consentimiento de datos.
- Revisa legalmente textos, ramos, exclusiones y política de privacidad.
- Configura rate limiting distribuido, analítica consentida y monitoreo en el hosting.
- Ajusta el prompt de Aurea en `server.mjs` y `api/concierge.js` según la estrategia de ventas.
