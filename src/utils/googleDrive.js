import dotenv from "dotenv";
dotenv.config();

import { google } from "googleapis";
import { PassThrough } from "stream";


const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "http://localhost"
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

/**
 * Upload PDF buffer to Google Drive
 * @param {Buffer} pdfBuffer
 * @param {string} fileName
 * @param {string} folderId
 * @returns {Promise<{ fileId: string, viewUrl: string }>}
 */
export async function uploadPdfToDrive(pdfBuffer, fileName, folderId) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!Buffer.isBuffer(pdfBuffer)) {
        throw new Error("uploadPdfToDrive: pdfBuffer is not a Buffer");
      }

      if (!folderId) {
        throw new Error("uploadPdfToDrive: folderId is missing");
      }

      const stream = new PassThrough();
      stream.end(pdfBuffer);

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType: "application/pdf",
          body: stream,
        },
        supportsAllDrives: true,
      });

      resolve({
        fileId: response.data.id,
        viewUrl: `https://drive.google.com/file/d/${response.data.id}/view`,
      });

    } catch (err) {
      // 🔴 INVALID / REVOKED REFRESH TOKEN
      if (
        err?.code === 401 ||
        err?.code === 403 ||
        err?.response?.data?.error === "invalid_grant"
      ) {
        console.error("❌ Google Drive auth failed: INVALID REFRESH TOKEN");
        console.error(
          "👉 Action required: regenerate REFRESH_TOKEN and update .env"
        );

        return reject(new Error("Google Drive authentication failed"));
      }

      // 🔴 PERMISSION / FOLDER ISSUES
      if (err?.code === 404) {
        console.error("❌ Google Drive folder not found:", folderId);
        return reject(new Error("Google Drive folder not found"));
      }

      if (err?.code === 403) {
        console.error("❌ Google Drive permission denied");
        return reject(new Error("Google Drive permission denied"));
      }

      // 🔴 UNKNOWN ERROR
      console.error("❌ Google Drive upload error:", err.message);
      reject(err);
    }
  });
}

/**
 * Upload a small text file to Google Drive to verify auth + folder access
 * @param {string} folderId
 * @param {string} [textContent]
 * @param {string} [fileName]
 * @returns {Promise<{ fileId: string, viewUrl: string }>}
 */
export async function uploadTextTestFileToDrive(
  folderId,
  textContent = "Google Drive test upload successful.",
  fileName = `drive-test-${Date.now()}.txt`
) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!folderId) {
        throw new Error("uploadTextTestFileToDrive: folderId is missing");
      }

      const stream = new PassThrough();
      stream.end(Buffer.from(textContent, "utf-8"));

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType: "text/plain",
          body: stream,
        },
        supportsAllDrives: true,
      });

      resolve({
        fileId: response.data.id,
        viewUrl: `https://drive.google.com/file/d/${response.data.id}/view`,
      });
    } catch (err) {
      if (
        err?.code === 401 ||
        err?.code === 403 ||
        err?.response?.data?.error === "invalid_grant"
      ) {
        console.error("Google Drive auth failed: INVALID REFRESH TOKEN");
        return reject(new Error("Google Drive authentication failed"));
      }

      if (err?.code === 404) {
        console.error("Google Drive folder not found:", folderId);
        return reject(new Error("Google Drive folder not found"));
      }

      if (err?.code === 403) {
        console.error("Google Drive permission denied");
        return reject(new Error("Google Drive permission denied"));
      }

      console.error("Google Drive test upload error:", err.message);
      reject(err);
    }
  });
}
