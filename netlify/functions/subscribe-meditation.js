// netlify/functions/subscribe-meditation.js
//
// Recibe nombre + email desde la página de la meditación
// y los guarda en Brevo, en la lista dedicada a este lead magnet.

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

const LIST_MEDITACION = 7;

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
      ORIGEN: "lead_magnet_meditacion",
      FECHA_REGISTRO: today,
      ACEPTA_COMUNICACIONES: true
    },
    listIds: [LIST_MEDITACION],
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
