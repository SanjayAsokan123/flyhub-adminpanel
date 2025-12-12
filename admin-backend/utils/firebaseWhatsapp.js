import axios from "axios";

export async function sendWhatsappMessage(phone, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: `91${phone}`,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_PERMANENT_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("📲 WhatsApp sent to", phone);

  } catch (err) {
    console.log("❌ WhatsApp Error:", err.response?.data || err.message);
  }
}
export async function sendWhatsappTemplate(phone, template, variables = []) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: `91${phone}`,
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: variables.map((v) => ({
                type: "text",
                text: v,
              })),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_PERMANENT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📲 WhatsApp Template Sent:", phone);

  } catch (err) {
    console.log("❌ WhatsApp Template Error:", err.response?.data || err.message);
  }
}
