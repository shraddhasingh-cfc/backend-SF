// src/routes/invoices.js

import express from "express";
import puppeteer from "puppeteer";
import { generatePdfFromUrl } from "../utils/pdfGenerator.js";
import { uploadPdfToDrive } from "../utils/googleDrive.js";

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

router.post("/save", (req, res) => {
    const { slug, form } = req.body; log(slug, form);

    if (!slug || !form) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    // Store invoice data temporarily (Redis / memory cache)
    saveInvoice(slug, form);

    res.json({ ok: true });
});

router.get("/:slug", (req, res) => {
    log(43, req.params.slug)
    const invoice = getInvoice(req.params.slug);
    log(invoice?.sellerNames);
    // output  sellerNames: [ { name: 'Billy Terry', rv_code: 'BJT', storeCode= 's2' } ],
    if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
    }
    res.json(invoice);
});

/* ==================================================
   GENERATE INVOICE PDF
   - Uses Puppeteer to render frontend invoice page
   - MUST be defined before `/:slug`
================================================== */
// full route /api/invoice/pdf/:slug
router.get('/pdf/old/:slug', async (req, res) => {
    const { slug } = req.params; console.log(slug);
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
        const url = `http://${client_ip}:${client_port}/internal-invoice/${slug}`;
        // const url = 'http://localhost:5000/';

        // Load page and wait until everything is ready
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 6000,
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
    const { slug } = req.params;

    const invoice = getInvoice(slug);
    if (!invoice) {
        return res.status(404).json({ error: "Invoice not found in cache" });
    }

    const storeCode = invoice?.sellerNames?.[0]?.storeCode;

    let targetFolderId;
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

    if (!targetFolderId) {
        return res.status(500).json({
            error: "Drive folder not configured"
        });
    }

    try {
        const url = `http://${client_ip}:${client_port}/internal-invoice/${slug}`;

        // ✅ ONE line PDF generation
        const pdfBuffer = await generatePdfFromUrl(url);

        // Default upload to Salesform_PDF folder in googledrive public
        uploadPdfToDrive(
            pdfBuffer,
            `${slug}.pdf`,
            process.env.FOLDER_ID_2
        ).catch(err => {
            console.error("Drive upload failed:", err.message);
        });


        // ✅ Upload by location
        uploadPdfToDrive(
            pdfBuffer,
            `${slug}.pdf`,
            targetFolderId
        ).catch(err => {
            console.error("Drive upload failed:", err.message);
        });

        // ✅ Respond
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${slug}.pdf"`
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