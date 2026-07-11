// netlify/functions/subscribe-meditation.js
//
// Recibe nombre + email desde la página de la meditación y los guarda en Brevo,
// dentro de la lista única Comunidad Lady Loana, marcando el recurso recibido.

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

// Misma lista única que subscribe.js, ID #11.
const LIST_COMUNIDAD = 11;

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

  const { nombre, email, optIn } = data;

  if (!email || !email.includes("@")) {
    return { statusCode: 400, body: JSON.stringify({ error: "Email inválido" }) };
  }

  if (optIn !== true) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta consentimiento RGPD" }) };
  }

  const today = new Date().toISOString().split("T")[0];

  const payload = {
    email: email,
    attributes: {
      NOMBRE: nombre || "",
      ETAPA_RECORRIDO: "Explorando",
      ORIGEN_PRIMER_CONTACTO: "meditacion",
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
