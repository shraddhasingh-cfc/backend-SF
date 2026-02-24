import axios from "axios";
import qs from "qs";
import { uspsConfig } from "../config/usps.config.js";

let cachedToken = null;
let tokenExpiry = null;

// 1️⃣ Get OAuth Token
async function getAccessToken() {
  if (cachedToken && tokenExpiry > Date.now()) {
    return cachedToken;
  }
  const response = await axios.post(
    uspsConfig.oauthUrl,
    qs.stringify({
      grant_type: "client_credentials",
      client_id: uspsConfig.clientId,
      client_secret: uspsConfig.clientSecret,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  cachedToken = response.data.access_token;

  tokenExpiry =
    Date.now() + response.data.expires_in * 1000 - 60000;

  return cachedToken;
}

// 2️⃣ Verify Address
export async function verifyAddressUSPS(addressData) {
  const token = await getAccessToken();

  const response = await axios.get(
    `${uspsConfig.apiBaseUrl}/address`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        streetAddress: addressData.address1,
        secondaryAddress: "", // optional but include empty
        city: addressData.city,
        state: addressData.state.toUpperCase(),
        ZIPCode: String(addressData.zip),
      },
    }
  );

  return response.data;
}