import express from "express";
import { formQuery } from "../config/db.js";

const router = express.Router();

/*
===========================
TOTAL ANALYTICS
===========================
*/

router.get("/analytics", async (req, res) => {
  try {

    const totalInvoices = await formQuery(`
      SELECT COUNT(*) as total 
      FROM invoices_archive
    `);

    const totalQuotesheet = await formQuery(`
      SELECT COUNT(*) as total
      FROM invoices_archive
      WHERE invoice_type = 'QS'
    `);

    const totalRTS = await formQuery(`
      SELECT COUNT(*) as total
      FROM invoices_archive
      WHERE transaction_mode = 'RETURN'
    `);

    const completedSales = await formQuery(`
      SELECT COUNT(*) as total
      FROM invoices_archive
      WHERE transaction_mode = 'SALE'
      AND invoice_type IN ('RG','PH')
    `);

    res.json({
      totalInvoices: totalInvoices[0].total,
      totalQuotesheet: totalQuotesheet[0].total,
      totalRTS: totalRTS[0].total,
      completedSales: completedSales[0].total
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analytics error" });
  }
});


/*
===========================
DATE ANALYTICS
===========================
*/

router.get("/analytics/date/:date", async (req, res) => {

  const date = req.params.date;

  try {

    const quotesheetToday = await formQuery(`
      SELECT COUNT(*) as total
      FROM invoices_archive
      WHERE invoice_type = 'QS'
      AND DATE(created_at) = ?
    `,[date]);

    const rtsToday = await formQuery(`
      SELECT COUNT(*) as total
      FROM invoices_archive
      WHERE transaction_mode = 'RETURN'
      AND DATE(created_at) = ?
    `,[date]);

    const saleToday = await formQuery(`
      SELECT COUNT(*) as total
      FROM invoices_archive
      WHERE transaction_mode = 'SALE'
      AND DATE(created_at) = ?
    `,[date]);

    res.json({
      quotesheetToday: quotesheetToday[0].total,
      rtsToday: rtsToday[0].total,
      saleToday: saleToday[0].total
    });

  } catch(err){
    res.status(500).json({error:"Date analytics error"})
  }

});

export default router;
//GET http://localhost:5000/admin/analytics/date/2026-03-06
//GET http://localhost:5000/admin/analytics