// netlify/functions/subscribe.js
//
// Esta función recibe el email + resultado del test desde la landing
// y lo envía de forma segura a Brevo, sin exponer la API key en el navegador.
//
// La API key se lee desde las variables de entorno de Netlify (BREVO_API_KEY),
// nunca desde el código visible al público.

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

// IDs de las listas ya existentes en Brevo (carpeta "Leads Landing Principal")
const LISTS = {
  GENERAL: 3,
  PROFESIONAL: 4,
  CONSCIENTE: 5,
  BUSCADOR: 6
};

function getListIdForProfile(profileName, producto) {
  const name = (profileName || "").toLowerCase();
  const prod = (producto || "").toLowerCase();

  const buscadorSignals = ["gremlín", "saboteador", "controlador", "perfeccionista", "hiperindependiente"];
  if (buscadorSignals.some(s => name.includes(s))) return LISTS.BUSCADOR;

  const conscienteSignals = ["mente consciente", "capa más profunda", "patrón con historia", "invisible", "complaciente"];
  if (conscienteSignals.some(s => name.includes(s))) return LISTS.CONSCIENTE;

  const profesionalSignals = ["profesional sensible", "sistema equilibrado", "mente cansada", "sistema saturado", "construcción"];
  if (profesionalSignals.some(s => name.includes(s))) return LISTS.PROFESIONAL;

  if (prod.includes("mental detox")) return LISTS.PROFESIONAL;
  if (prod.includes("volver a ti")) return LISTS.CONSCIENTE;
  if (prod.includes("gremlín")) return LISTS.BUSCADOR;

  return null;
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

  const { email, resultado, producto, testId, optIn } = data;

  if (!email || !email.includes("@")) {
    return { statusCode: 400, body: JSON.stringify({ error: "Email inválido" }) };
  }

  if (optIn !== true) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta consentimiento RGPD" }) };
  }

  const listIds = [LISTS.GENERAL];
  const profileListId = getListIdForProfile(resultado, producto);
  if (profileListId) listIds.push(profileListId);

  const today = new Date().toISOString().split("T")[0];

  const payload = {
    email: email,
    attributes: {
      RESULTADO_TEST: resultado || "",
      PRODUCTO_RECOMENDADO: producto || "",
      ORIGEN: testId || "landing",
      FECHA_TEST: today
    },
    listIds: listIds,
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
