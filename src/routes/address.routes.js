import express from "express";
import { verifyAddressController } from "../controllers/address.controller.js";

const router = express.Router();

router.post("/verify", verifyAddressController);

export default router;