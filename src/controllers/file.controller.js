// src/fileProcessor.js
const fs = require("fs");
const path = require("path");
const csv = require("csvtojson");
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
 
// ---------------- Configuration ----------------
const ACCOUNT_NAME = "kineticadbms";
const ACCOUNT_KEY = "JfMzO69p3Ip+Sz+YkXxp7sHxZw0O/JunSaS5qKnSSQnxk1lPhwiQwnGyyJif7sGB01l9amAdvU/t+ASthIK/ZQ==";
const CONTAINER_NAME = "thrive-app-data";
const LOCAL_SAVE_FOLDER = "./src/source_data_folder";
const JSON_OUTPUT_FOLDER = "./src/data_source";
const CLIENT_ID = "TH-1753144646395";
 
// Helper functions
function toSnakeCase(str) {
  return str
    .replace(/[^0-9a-zA-Z]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
 
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => chunks.push(data));
    readableStream.on("end", () => resolve(Buffer.concat(chunks)));
    readableStream.on("error", reject);
  });
}
 
// ---------------- Download Blobs ----------------
async function downloadBlobs(folderName) {
  const credentials = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
  const blobServiceClient = new BlobServiceClient(
    `https://${ACCOUNT_NAME}.blob.core.windows.net`,
    credentials
  );
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
 
  fs.mkdirSync(LOCAL_SAVE_FOLDER, { recursive: true });
  console.log(`Downloading files from '${CONTAINER_NAME}/${folderName}'...`);
 
  const downloadedFiles = [];
 
  for await (const blob of containerClient.listBlobsFlat({ prefix: folderName })) {
    const relativePath = blob.name.replace(folderName, "");
    const localFilePath = path.join(LOCAL_SAVE_FOLDER, relativePath);
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
 
    const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
    const downloadResponse = await blockBlobClient.download();
 
    if (!downloadResponse.readableStreamBody) {
      console.warn(`Skipping blob ${blob.name}, readableStreamBody is undefined`);
      continue;
    }
 
    const downloadedData = await streamToBuffer(downloadResponse.readableStreamBody);
    fs.writeFileSync(localFilePath, downloadedData);
 
    downloadedFiles.push(localFilePath);
  }
 
  return downloadedFiles;
}
 
// ---------------- Convert CSV to JSON ----------------
async function convertCsvToJson(filePath, extraFields = {}) {
  const fileName = path.basename(filePath);
  let records = await csv({ trim: true }).fromFile(filePath);
 
  records = records.map((record) => {
    const newRecord = {};
    for (const key in record) {
      newRecord[toSnakeCase(key)] = record[key];
    }
    for (const key in extraFields) {
      newRecord[key] =
        typeof extraFields[key] === "function"
          ? extraFields[key](newRecord)
          : extraFields[key];
    }
    return newRecord;
  });
 
  fs.mkdirSync(JSON_OUTPUT_FOLDER, { recursive: true });
  const jsonFileName = path.basename(fileName, path.extname(fileName)) + ".json";
  const jsonFilePath = path.join(JSON_OUTPUT_FOLDER, jsonFileName);
  fs.writeFileSync(jsonFilePath, JSON.stringify(records, null, 4));
 
  // Delete original CSV
  fs.unlinkSync(filePath);
 
  return jsonFileName;
}
 
// ---------------- Controller Function ----------------
async function processFolderFiles(req, res) {
  try {
    const folderName = req.body.folderName || "Processed/"; // default folder
    const EXTRA_FIELDS = {
      client_id: CLIENT_ID,
      platform: (record) => (record.platform ? record.platform.toLowerCase() : "")
    };
 
    console.log("🔹 Starting download and conversion process...");
    const csvFiles = await downloadBlobs(folderName);
 
    const jsonFiles = [];
    for (const file of csvFiles) {
      const jsonFile = await convertCsvToJson(file, EXTRA_FIELDS);
      jsonFiles.push(jsonFile);
    }
 
    res.status(200).json({
      message: "✅ All files downloaded, converted to JSON, and CSVs deleted successfully!",
      files: jsonFiles
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Error processing files", error: err.message });
  }
}
 
module.exports = { processFolderFiles };
 
 