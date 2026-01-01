require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const salesRouter = require("./routes/sales");
const authRouter = require("./routes/auth");

const app = express();
app.use(express.json()); // parse JSON body
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection failed:", err));

app.use("/api/sales", salesRouter);
app.use("/api/auth", authRouter);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
