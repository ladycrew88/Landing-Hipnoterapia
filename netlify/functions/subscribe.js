// netlify/functions/subscribe.js
//
// Esta función recibe el resultado del test desde la landing y lo envía
// de forma segura a Brevo, sin exponer la API key en el navegador.
//
// Arquitectura: una sola lista (Comunidad Lady Loana, ID 11) con atributos,
// en vez de listas separadas por perfil.

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

// ID de la lista única "Comunidad Lady Loana" (carpeta Leads Landing Principal).
const LIST_COMUNIDAD = 11;

// Mapea el nombre del perfil resultante a su categoría de interés y patrón predominante.
function getClasificacionPorPerfil(profileName) {
  const name = (profileName || "").toLowerCase();

  const mapa = {
    "el sistema en alerta": { categoria: "Gestión del estrés", patron: "Exigencia interna / Saturación" },
    "la puerta sin abrir": { categoria: "Trabajo profundo", patron: "Capa no accedida por el trabajo consciente" },
    "la duda que decide": { categoria: "Autoestima y valor propio", patron: "Brecha entre saber y sentir el propio valor" },
    "el patrón saboteador": { categoria: "Patrones de protección", patron: "Autosabotaje" },
    "gremlín activo": { categoria: "Patrones de protección", patron: "Autosabotaje activo" },
    "gremlín moderado": { categoria: "Patrones de protección", patron: "Autosabotaje intermitente" },
    "patrón en construcción": { categoria: "Patrones de protección", patron: "Autosabotaje temprano" },
    "sistema equilibrado": { categoria: "Gestión del estrés", patron: "Prevención" },
    "mente cansada": { categoria: "Gestión del estrés", patron: "Acumulación moderada" },
    "sistema saturado": { categoria: "Gestión del estrés", patron: "Alerta permanente" },
    "la capa más profunda": { categoria: "Trabajo profundo", patron: "Patrón resistente al trabajo consciente" },
    "el patrón con historia": { categoria: "Trabajo profundo", patron: "Patrón con origen antiguo" },
    "la costumbre de complacer": { categoria: "Relaciones y límites", patron: "Complacencia" },
    "el control como refugio": { categoria: "Control / Seguridad", patron: "Necesidad de control" },
    "la perfección como refugio": { categoria: "Control / Seguridad", patron: "Perfeccionismo" },
    "cargar antes que confiar": { categoria: "Relaciones y límites", patron: "Hiperindependencia" },
    "el/la invisible": { categoria: "Autoestima y valor propio", patron: "Autoinvisibilización" }
  };

  return mapa[name] || { categoria: "Crecimiento personal", patron: "Patrón general" };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Falta configurar BREVO_API_KEY en Netlify" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { email, nombre, resultado, producto, testId, optIn, descripcion, ejercicio, practica2, porquePrograma } = data;

  if (!email || !email.includes("@")) {
    return { statusCode: 400, body: JSON.stringify({ error: "Email inválido" }) };
  }

  if (optIn !== true) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta consentimiento RGPD" }) };
  }

  const clasificacion = getClasificacionPorPerfil(resultado);
  const today = new Date().toISOString().split("T")[0];

  const payload = {
    email: email,
    attributes: {
      NOMBRE: nombre || "",
      RESULTADO_TEST: resultado || "",
      RESULTADO_DESC: descripcion || "",
      EJERCICIO: ejercicio || "",
      PRACTICA_2: practica2 || "",
      PORQUE_PROGRAMA: porquePrograma || "",
      INTERES_PRINCIPAL: clasificacion.categoria,
      PATRON_PREDOMINANTE: clasificacion.patron,
      PRODUCTO_SUGERIDO_ACTUAL: producto || "",
      ETAPA_RECORRIDO: "Identificado",
      ORIGEN_PRIMER_CONTACTO: testId || "test_landing",
      FECHA_PRIMER_CONTACTO: today,
      FECHA_ULTIMA_INTERACCION: today,
      ACEPTA_MARKETING: true
    },
    listIds: [LIST_COMUNIDAD],
    updateEnabled: true
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 201 || response.status === 204) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    const errorBody = await response.text();
    return {
      statusCode: response.status,
      body: JSON.stringify({ error: "Error de Brevo", detail: errorBody })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error de conexión", detail: err.message })
    };
  }
};
