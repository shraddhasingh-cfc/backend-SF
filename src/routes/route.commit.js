import express from "express";
import { commitInvoice } from "../controllers/quotesheet.controller.js";

const router = express.Router();

router.post("/commit", commitInvoice);

export default router;