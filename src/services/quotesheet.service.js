import { generatePdfFromUrl } from "../utils/generatePdf.js";
import { uploadPdfToDrive } from "../utils/driveUpload.js";

export async function commitInvoice({ slug, type }) {

  // 1️⃣ Generate PDF
  const url = `http://localhost:3000/invoice-preview/${slug}`;
  const pdfBuffer = await generatePdfFromUrl(url);

  // 2️⃣ Choose folder dynamically
  const folderId =
    type === "QUOTE"
      ? process.env.QUOTESHEET_FOLDER_ID
      : process.env.SALES_FOLDER_ID;

  // 3️⃣ Upload to correct Drive folder
  const driveResult = await uploadPdfToDrive(
    pdfBuffer,
    `${slug}.pdf`,
    folderId
  );

  return {
    success: true,
    driveLink: driveResult.viewUrl,
  };
}