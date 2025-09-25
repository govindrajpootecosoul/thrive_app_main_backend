const express = require("express");
const { processFolderFiles } = require("../controllers/file.controller");

const router = express.Router();

// POST: /api/files/process/:folderName
router.post("/process/:folderName", processFolderFiles);

module.exports = router;
