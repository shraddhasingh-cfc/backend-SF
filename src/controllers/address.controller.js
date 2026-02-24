import { verifyAddressUSPS } from "../services/usps.service.js";

export async function verifyAddressController(req, res) {
  try {
    const { address1, city, state, zip } = req.body;

    if (!address1 || !city || !state || !zip) {
      return res.status(400).json({
        valid: false,
        message: "Missing required fields",
      });
    }

    const result = await verifyAddressUSPS({
      address1,
      city,
      state,
      zip,
    });

    return res.json({
      valid: true,
      standardizedAddress: result,
    });

  } catch (error) {
  const uspsError = error.response?.data;

  let userMessage = "Address could not be verified.";

  if (uspsError?.error?.message?.includes("does not match input string")) {
    userMessage = "Only valid US state codes are allowed (e.g., NC, CA, TX).";
  }

  if (uspsError?.error?.message?.includes("ZIPCode")) {
    userMessage = "ZIP code must be a valid 5-digit US ZIP.";
  }

  console.error("USPS FULL ERROR:", uspsError || error.message);

  return res.status(200).json({
    valid: false,
    reason: userMessage
  });
}
}