import dotenv from "dotenv";
dotenv.config();
import { uploadTextTestFileToDrive } from "../utils/googleDrive.js";

const result = await uploadTextTestFileToDrive(
  process.env.FOLDER_QS,
  "Test from backend",
  "drive-health-check.txt"
);

console.log(result);
