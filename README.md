# Privilegio — experiencia digital premium

## Arquitectura

```text
public/                 Experiencia web estática: marca, animaciones y concierge UI
server.mjs              Servidor Node: entrega el sitio y protege la llamada de IA
POST /api/concierge     Proxy de Gemini con reglas comerciales y de seguridad
.env                    Secretos locales (nunca se publican ni llegan al navegador)
```

La interfaz no conoce la clave de Gemini. El servidor añade el contexto de Privilegio, limita el tamaño de las consultas y orienta al visitante a una cotización con un asesor humano; no ofrece precios, contratos ni decisiones de cobertura.

## Ejecutar

1. Copia `.env.example` como `.env`.
2. Añade la clave en `GEMINI_API_KEY` de forma local.
3. Ejecuta `npm start` y abre `http://localhost:3000`.

## Personalización antes de publicar

- Sustituye los enlaces de WhatsApp y correo de demostración por los canales oficiales.
- Conecta el formulario a CRM / HubSpot / Salesforce y añade consentimiento de datos.
- Revisa legalmente textos, ramos, exclusiones y política de privacidad.
- Configura rate limiting distribuido, analítica consentida y monitoreo en el hosting.
