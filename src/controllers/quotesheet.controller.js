import * as invoiceService from "../services/quotesheet.service.js";

export async function commitInvoice(req, res) {
  try {
    const result = await invoiceService.commitInvoice(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to commit invoice" });
  }
}