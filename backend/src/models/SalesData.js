const mongoose = require("mongoose");

const SalesDataSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  store_id: { type: String, required: true },
  date: { type: Date, required: true },
  sales: { type: Number, required: true },
  uploaded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SalesData", SalesDataSchema);
