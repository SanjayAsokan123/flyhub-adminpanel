import axios from "axios";

let cachedToken = null;
let expiry = null;

export async function getShiprocketToken() {
  if (cachedToken && expiry > Date.now()) return cachedToken;

  const res = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }
  );

  cachedToken = res.data.token;
  expiry = Date.now() + 23 * 60 * 60 * 1000; // 23 hours

  return cachedToken;
}
