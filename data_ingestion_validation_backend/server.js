// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer config
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    if (!file.originalname.match(/\.csv$/i)) {
      return cb(new Error("Only CSV files allowed"));
    }
    cb(null, true);
  },
});

// simple CSV validator (same as you used)
function validateCSV(rows) {
  const report = {
    totalRows: rows.length,
    headers: Object.keys(rows[0] || {}),
    missingValues: 0,
    typeSummary: {},
    errors: [],
  };
  if (rows.length === 0) {
    report.errors.push("Empty or invalid CSV structure");
    return report;
  }
  const typeCounts = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!typeCounts[key]) typeCounts[key] = { number: 0, string: 0, date: 0, nulls: 0 };
      const val = String(value || "").trim();
      if (!val) typeCounts[key].nulls++;
      else if (!isNaN(Number(val))) typeCounts[key].number++;
      else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) typeCounts[key].date++;
      else typeCounts[key].string++;
    }
  }
  report.missingValues = Object.values(typeCounts).reduce((sum, t) => sum + t.nulls, 0);
  for (const [col, counts] of Object.entries(typeCounts)) {
    const maxType = Object.entries(counts).filter(([k]) => k !== "nulls").sort((a,b)=>b[1]-a[1])[0][0];
    report.typeSummary[col] = maxType;
  }
  return report;
}

// 1) upload + validate route
app.post("/api/data/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const rows = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", () => {
      const validation = validateCSV(rows);

      // keep a copy as latest.csv for subsequent endpoints
      const savedPath = path.join(uploadDir, "latest.csv");
      fs.copyFileSync(req.file.path, savedPath);
      // remove the uploaded file (timestamped)
      try { fs.unlinkSync(req.file.path); } catch(e){}

      return res.json({
        message: validation.errors.length ? "❌ Validation failed" : "✅ Validation successful",
        ...validation,
      });
    })
    .on("error", (err) => res.status(500).json({ message: "Error reading CSV", details: err.message }));
});

// 2) calculate ROP route (reads latest.csv)
app.get("/api/data/calculate-rop", (_, res) => {
  const filePath = path.join(uploadDir, "latest.csv");
  if (!fs.existsSync(filePath)) return res.status(400).json({ message: "No validated CSV found. Upload first." });

  const rows = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", d => rows.push(d))
    .on("end", () => {
      const leadTime = 5;
      const safetyStockFactor = 0.2;
      const products = {};

      rows.forEach(r => {
        const pid = r["Product_ID"];
        const unitsSold = Number(r["Units_Sold"]);
        if (!products[pid]) products[pid] = [];
        if (!isNaN(unitsSold) && unitsSold > 0) products[pid].push(unitsSold);
      });

      const ropResults = {};
      const lowInventory = [];
      for (const [pid, sales] of Object.entries(products)) {
        const avg = sales.reduce((s,v)=>s+v,0)/sales.length;
        const safety = safetyStockFactor * avg;
        const reorderPoint = Math.round(avg * leadTime + safety);

        // get latest inventory for this product (last row in CSV with that Product_ID)
        const latestRow = [...rows].reverse().find(r => r["Product_ID"] === pid);
        const inventoryLevel = Number(latestRow?.["Inventory_Level"] || 0);

        ropResults[pid] = {
          averageDailyDemand: Math.round(avg),
          safetyStock: Math.round(safety),
          reorderPoint,
          inventoryLevel,
        };
        if (inventoryLevel < reorderPoint) lowInventory.push({ productId: pid, inventoryLevel, reorderPoint });
      }

      return res.json({
        message: lowInventory.length ? `⚠️ ${lowInventory.length} product(s) below ROP` : "✅ All good",
        reorderPoints: ropResults,
        lowInventory
      });
    })
    .on("error",(err)=>res.status(500).json({ message: "Error reading CSV", details: err.message }));
});

// 3) forward to ML FastAPI (reads latest.csv and sends to FastAPI /forecast)
app.post("/api/data/forecast", async (req, res) => {
  try {
    const csvPath = path.join(uploadDir, "latest.csv");
    if (!fs.existsSync(csvPath)) return res.status(400).json({ message: "No validated CSV found. Upload first." });

    const form = new FormData();
    form.append("file", fs.createReadStream(csvPath));
    // these are optional params for ML; if you want override you can add query/body later
    form.append("datecol", "Date");
    form.append("target", "Units_Sold");
    form.append("horizon", "6");   // months
    form.append("freq", "M");

    const r = await axios.post("http://127.0.0.1:8000/forecast", form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 2*60*1000,
    });

    return res.json(r.data);
  } catch (err) {
    console.error("Forecast forward error:", err.toString());
    if (err.response) {
      return res.status(err.response.status || 500).json({ message: "FastAPI error", detail: err.response.data });
    }
    return res.status(500).json({ message: "Forecast generation failed", error: err.message });
  }
});

const PORT = 5002;
app.listen(PORT, () => console.log(`Node server running on port ${PORT}`));

module.exports = app;
