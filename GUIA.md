# Cómo conectar tu chatbot a Facebook Messenger

## Resumen del proceso
1. Subes `server.js` a un hosting gratuito (Render)
2. Creas una app en Meta for Developers
3. Conectas tu Página de Facebook a esa app
4. Conectas la app a tu servidor (webhook)
5. Listo — la gente te escribe por Messenger y el bot responde

---

## Paso 1 — Sube el servidor a Render (gratis)

1. Crea una cuenta en https://render.com (puedes entrar con GitHub)
2. Sube esta carpeta (`server.js`, `package.json`) a un repositorio de GitHub
   - Si no usas GitHub aún: crea un repo nuevo en https://github.com/new, y sube los archivos desde la web (botón "Add file" → "Upload files")
3. En Render: **New +** → **Web Service** → conecta tu repositorio
4. Configuración:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
5. En la pestaña **Environment**, agrega estas variables (por ahora deja los valores en blanco, las completamos en el paso 3):
   - `VERIFY_TOKEN` → inventa cualquier palabra secreta, ej: `derecho2026seguro`
   - `PAGE_ACCESS_TOKEN` → la llenamos en el paso 3
   - `GEMINI_API_KEY` → opcional, solo si quieres respuestas con IA (déjala vacía si no)
6. Clic en **Create Web Service** — espera a que despliegue (unos 2-3 minutos)
7. Copia la URL que te da Render, algo como `https://tu-app.onrender.com`

> Nota: en el plan gratuito de Render, el servidor "se duerme" tras un rato sin uso y tarda unos segundos en despertar con el primer mensaje. Es normal.

---

## Paso 2 — Crea la app en Meta for Developers

1. Ve a https://developers.facebook.com/apps y clic en **Crear app**
2. Elige el tipo **"Otro"** → **"Empresa"** (o "Business")
3. Ponle un nombre, ej: "Asistente Jurídico"
4. Dentro del panel de tu app, busca el producto **Messenger** y clic en **Configurar**

---

## Paso 3 — Conecta tu Página de Facebook

1. Necesitas una **Página de Facebook** (no un perfil personal). Si no tienes una, créala en https://www.facebook.com/pages/create
2. En el panel de Messenger de tu app, sección **Access Tokens**, clic en **Add or Remove Pages** y selecciona tu página
3. Copia el **Page Access Token** que te genera
4. Ve a Render → tu servicio → **Environment** → pega ese valor en `PAGE_ACCESS_TOKEN` → guarda (esto reinicia el servicio)

---

## Paso 4 — Configura el Webhook

1. En el panel de Messenger de tu app, sección **Webhooks**, clic en **Add Callback URL**
2. **Callback URL:** `https://tu-app.onrender.com/webhook` (la URL de Render + `/webhook`)
3. **Verify Token:** el mismo valor que pusiste en `VERIFY_TOKEN` en Render (ej: `derecho2026seguro`)
4. Clic en **Verify and Save** — si todo está bien, Meta debería aceptar sin error
5. En **Webhook fields**, suscríbete al campo **messages**

---

## Paso 5 — Pruébalo

1. Ve a tu Página de Facebook → botón **Enviar mensaje**
2. Escribe "hola" — el bot debería responder en unos segundos

---

## Notas importantes

- **Modo desarrollo vs público:** mientras tu app esté en modo "Development" en Meta, solo las personas que agregues como *testers/administradores* de la app podrán hablarle al bot. Para que cualquiera pueda escribirle, Meta pide pasar por un proceso de **revisión de la app** (App Review), donde explicas para qué usas el permiso `pages_messaging`. Esto es gratis pero toma algunos días.
- **Costo:** la Messenger Platform en sí es gratuita. Solo pagarías si usas Render en un plan pago (no es necesario para uso personal/bajo volumen) o si activas Gemini con mucho volumen.
- **Seguridad:** nunca subas tus tokens (`PAGE_ACCESS_TOKEN`, `GEMINI_API_KEY`) directamente en el código a GitHub. Ponlos siempre como variables de entorno, como se explicó arriba.
