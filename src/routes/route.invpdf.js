// src/routes/invoices.js

import express from "express";
import puppeteer from "puppeteer";
import { generatePdfFromUrl } from "../utils/pdfGenerator.js";
import { uploadPdfToDrive } from "../utils/googleDrive.js";
import { formQuery } from "../config/db.js"
// import { saveInvoice, getInvoice } from "../cache/invoiceCache.js";
// import { db as mysqlPool } from "../config/db.js";

const router = express.Router();
const log = console.log;

// Frontend host & port (used for PDF rendering)
const client_ip = process.env.FRONTEND_HOST || "localhost";
const client_port = process.env.PORT || "5000";

const invoiceCache = new Map();
function saveInvoice(slug, data, ttlMs = 1 * 60 * 60 * 1000) {
  invoiceCache.set(slug, data);
  setTimeout(() => {
    invoiceCache.delete(slug);

  }, ttlMs);
}
function getInvoice(slug) {
  return invoiceCache.get(slug);
}

router.post("/save", async (req, res) => {
  // console.log("SAVE HIT:", req.body.slug, new Date().toISOString());
  const { slug, form } = req.body; //log(slug, form);

  if (!slug || !form) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // Store invoice data temporarily (Redis / memory cache)
  // saveInvoice(slug, form);

  // res.json({ ok: true });
  try {
    // ✅ Make deep copy
    const formToStore = { ...form };

    // ❌ Remove signatures before DB save
    delete formToStore.customerSignature;
    delete formToStore.managerSignature;
    // ✅ 1. Keep existing behavior (DO NOT REMOVE)
    saveInvoice(slug, form);

    // ✅ 2. NEW: Save to invoices_archive using cfcFormPool
    await formQuery(
      `
      INSERT INTO invoices_archive
      (slug, invoice_type,transaction_mode, editable, form_json)
      VALUES (?, ?, ?, ?,?)
      ON DUPLICATE KEY UPDATE
        invoice_type = VALUES(invoice_type),
        transaction_mode = VALUES(transaction_mode),
        form_json = VALUES(form_json),
        updated_at = NOW()
      `,
      [
        slug,
         form.invoiceType || "RG",
         form.transactionMode || "SALE",
        true,
        JSON.stringify(form)
      ]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("Archive save failed:", err);
    res.status(500).json({ error: "Invoice save failed" });
  }
});
/* ==================================================
   ARCHIVE SEARCH (QS ONLY)
   GET /api/invoice/archive/search?q=SUNIL
================================================== */
/* ==================================================
   ARCHIVE SEARCH (RG | PH | QS)
   GET /api/invoice/archive/search?q=SUN&type=RG,PH
================================================== */
router.get("/archive/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const types = req.query.types; // "RG,PH"

    // 🚫 Avoid useless DB hits
    if (!q || q.length < 2) {
      return res.json({ ok: true, data: [] });
    }

    const searchValue = `%${q.toUpperCase()}%`;

    // ✅ Convert types to array
    let invoiceTypes = [];
    if (types) {
      invoiceTypes = types.split(",").map(t => t.trim());
    }

    // 🧠 Base query
    let sql = `
      SELECT slug, invoice_type, created_at
      FROM invoices_archive
      WHERE UPPER(slug) LIKE ?
    `;

    const params = [searchValue];

    // ✅ Add invoice type filter if provided
    if (invoiceTypes.length > 0) {
      sql += ` AND invoice_type IN (${invoiceTypes.map(() => "?").join(",")})`;
      params.push(...invoiceTypes);
    }

    // 🔥 Only 10 most matched results
    sql += `
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const rows = await formQuery(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("Archive search failed:", err);
    res.status(500).json({ ok: false });
  }
});
router.get("/:slug", async (req, res) => {
  const slug = req.params.slug;

  // 1️⃣ First check memory cache
  const cached = getInvoice(slug);
  if (cached) {
    return res.json(cached);
  }

  // 2️⃣ Fallback → Check DB archive
  try {
    const rows = await formQuery(
      "SELECT form_json FROM invoices_archive WHERE slug = ?",
      [slug]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const form = JSON.parse(rows[0].form_json);

    // Optional: re-cache
    saveInvoice(slug, form);

    res.json(form);

  } catch (err) {
    console.error("Archive load failed:", err);
    res.status(500).json({ error: "Load failed" });
  }
});
/* ==================================================
   GENERATE INVOICE PDF
   - Uses Puppeteer to render frontend invoice page
   - MUST be defined before `/:slug`
================================================== */
// full route /api/invoice/pdf/:slug
router.get('/pdf/old/:slug', async (req, res) => {
  const { slug } = req.params; //console.log(slug);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    // Viewport only affects rendering, not PDF size
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2,
    });
    // const url = `http://${client_ip}:${client_port}/invoice/${slug}`;
    // const url = `http://${client_ip}:${client_port}/internal-invoice/${slug}`;
    // const url = 'http://localhost:5000/';
    let url;
    // choose frontend page based on invoice type
    switch (invoiceType) {
      case "RTS":
        url = `http://${client_ip}:${client_port}/rts-preview/${slug}`;
        break;

      case "QS":
        url = `http://${client_ip}:${client_port}/internal-invoice/${slug}`;
        break;

      case "PH":
      case "RG":
      default:
        url = `http://${client_ip}:${client_port}/internal-invoice/${slug}`;
    }

    // Load page and wait until everything is ready
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    // Ensure invoice container is rendered
    await page.waitForSelector('.pdf-page', {
      timeout: 3000,
    });

    // Ensure fonts are fully loaded (important for invoices)
    await page.evaluateHandle('document.fonts.ready');

    // Generate PDF
    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '4mm',
        bottom: '4mm',
        left: '4mm',
        right: '4mm',
      },
      scale: 1,
    });

    // ✅ Convert Uint8Array → Buffer (REQUIRED in Node 22)
    const pdfBuffer = Buffer.from(pdfUint8);

    // Defensive check (now passes)
    if (!Buffer.isBuffer(pdfBuffer)) {
      throw new Error("PDF buffer is invalid");
    }

    // Upload to Google Drive
    uploadPdfToDrive(
      pdfBuffer,
      `${slug}.pdf`,
      process.env.TEST_100
    ).catch(err => {
      console.error("Drive upload failed:", err.message);
    });

    // Send to frontend
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${slug}.pdf"`
    );
    res.send(pdfBuffer);


  } catch (error) {
    console.error('PDF generation failed:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to generate invoice PDF',
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

router.get("/pdf/:slug", async (req, res) => {
  const { slug } = req.params; log(slug);
  let invoice = getInvoice(slug);
  if (!invoice) {
    const rows = await formQuery(
      "SELECT form_json FROM invoices_archive WHERE slug = ?",
      [slug]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    invoice = JSON.parse(rows[0].form_json);
    // restore cache
    saveInvoice(slug, invoice);
  }
  const storeCode = invoice?.sellerNames?.[0]?.storeCode; console.log(storeCode);
  // const isQuoteSheet = slug.startsWith("QS_");
  // return res.json('ok')
  // 🔥 Get invoice_type from DB
  const typeRows = await formQuery(
    "SELECT invoice_type FROM invoices_archive WHERE slug = ?",
    [slug]
  );
  if (!typeRows.length) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  const invoiceType = typeRows[0].invoice_type;
  const isQuoteSheet = invoiceType === "QS";
  let targetFolderId;
  if (isQuoteSheet) {
    targetFolderId = process.env.FOLDER_QS;
  } else {
    switch (storeCode) {
      case "S1":
        targetFolderId = process.env.FOLDER_100;
        break;
      case "S2":
        targetFolderId = process.env.FOLDER_200;
        break;
      default:
        targetFolderId = process.env.FOLDER_ID_2;
    }
  }
  if (!targetFolderId) {
    return res.status(500).json({
      error: "Drive folder not configured"
    });
  }
  try {
    let url;
    if (invoice.transactionMode === "RETURN") {
      url = `http://${client_ip}:${client_port}/rts-internal-invoice/${slug}`;
    } else {
      url = `http://${client_ip}:${client_port}/internal-invoice/${slug}`;
    }
    console.log("PDF URL:", url);
    // ✅ ONE line PDF generation
    const pdfBuffer = await generatePdfFromUrl(url);
    // Default upload to Salesform_PDF folder in googledrive public
    // uploadPdfToDrive(
    //     pdfBuffer,
    //     `${slug}.pdf`,
    //     process.env.FOLDER_ID_2
    // ).catch(err => {
    //     console.error("Drive upload failed:", err.message);
    // });
    // await uploadPdfToDrive(
    //     pdfBuffer,
    //     `${slug}.pdf`,
    //     targetFolderId
    // );
    const fileName = isQuoteSheet
      ? `QS_${slug}.pdf`
      : `${slug}.pdf`;

    await uploadPdfToDrive(
      pdfBuffer,
      fileName,
      targetFolderId
    );
    // ✅ Upload by location
    // uploadPdfToDrive(
    //     pdfBuffer,
    //     `${slug}.pdf`,
    //     targetFolderId
    // ).catch(err => {
    //     console.error("Drive upload failed:", err.message);
    // });
    // ✅ Respond
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({
      ok: false,
      message: "Failed to generate invoice PDF",
    });
  }
});
export default router;
/* 

const handleCommit = async () => {
    try {
      // ✅ STEP 1: Save invoice data to backend cache (REQUIRED)
      const saveRes = await fetch("/api/invoice/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          form, // full invoice form object
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        alert(err.error || "Failed to save invoice for PDF");
        return;
      }

      // 🔵 STEP 2 (OPTIONAL): Vendor override warning
      const overriddenItems = form.items.filter(
        (i) =>
          i.vendorOverride &&
          (i.item_status === "N" || i.item_status === "S")
      );

      if (overriddenItems.length > 0) {
        console.warn("⚠ Vendor override used:", overriddenItems);
      }
      
      // ✅ STEP 3: ALWAYS open PDF
      window.open(/api/invoice/pdf/${slug}, "_blank");


    } catch (err) {
      alert(err.message || "Commit failed.");
      console.error(err);
    }
  };

*/