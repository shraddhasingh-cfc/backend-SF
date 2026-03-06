import puppeteer from "puppeteer";
export async function generatePdfFromUrl(url, options = {}) {
    let browser;
    const {
        format = "A4",
        timeout = 6000,
        waitSelector = ".pdf-page",
        margins = {
            top: "4mm",
            bottom: "4mm",
            left: "4mm",
            right: "4mm",
        }
    } = options;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        });
        const page = await browser.newPage();
        await page.setViewport({
            width: 1200,
            height: 800,
            deviceScaleFactor: 2,
        });
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 20000,
        });
        // if (waitSelector) {
        //     await page.waitForSelector(waitSelector, { timeout: 15000 });
        // } during rts we commented this
        // Wait until React finishes rendering invoice
        await page.waitForFunction(
            () => window.__INVOICE_READY__ === true,
            { timeout: 30000 }
        );
        // Ensure fonts are fully loaded
        await page.evaluateHandle("document.fonts.ready");
        const pdfUint8 = await page.pdf({
            format,
            printBackground: true,
            preferCSSPageSize: true,
            margin: margins,
        });

        const pdfBuffer = Buffer.from(pdfUint8);

        if (!Buffer.isBuffer(pdfBuffer)) {
            throw new Error("Generated PDF buffer is invalid");
        }
        return pdfBuffer;

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
