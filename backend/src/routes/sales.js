const express = require("express");
const SalesData = require("../models/SalesData");
const router = express.Router();

// POST /api/sales/store
router.post("/store", async (req, res) => {
  try {
    const salesRecords = req.body;

    // Check if body is array
    if (!Array.isArray(salesRecords) || salesRecords.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array" });
    }

    // Validate each record
    for (const record of salesRecords) {
      if (!record.product_id || !record.store_id || !record.date || record.sales == null) {
        return res.status(400).json({ error: "Each record must include product_id, store_id, date, and sales" });
      }
    }

    // Insert into MongoDB
    const result = await SalesData.insertMany(salesRecords);
    res.status(201).json({
      message: "Sales data stored successfully",
      insertedCount: result.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;
