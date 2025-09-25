import express from "express";
import { processFolderFiles } from "../controllers/file.controller.js";

const router = express.Router();

// Define POST route
router.post("/process-files/:folderName", processFolderFiles);

export default router;
