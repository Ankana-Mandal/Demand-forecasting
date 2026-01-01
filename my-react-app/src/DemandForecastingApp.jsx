// DemandForecastingApp.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  TrendingUp,
  BarChart3,
  Database,
  Moon,
  Sun,
  LogOut,
  User,
  AlertTriangle,
} from "lucide-react";
import "./DemandForecastingApp.css";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
} from "chart.js";

import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// register chart elements
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

// custom plugin to draw accuracy text on the canvas
const accuracyPlugin = {
  id: "customCanvasText",
  afterDraw(chart, args, options) {
    const chartArea = chart.chartArea || {};
    const { ctx } = chart;
    const top = chartArea.top ?? 10;
    const left = chartArea.left ?? 10;

    // options passed from chart options.plugins.customCanvasText
    if (!options || options.accuracy == null) return;

    const accuracyText = typeof options.accuracy === "number"
      ? `${Number(options.accuracy).toFixed(1)}%`
      : String(options.accuracy);

    ctx.save();
    ctx.font = "600 14px Inter, Roboto, sans-serif";
    ctx.fillStyle = "#3b82f6"; // blue color
    ctx.textBaseline = "top";
    ctx.fillText(`Accuracy: ${accuracyText}`, left + 8, top + 6);
    ctx.restore();
  }
};

// register plugin with ChartJS
ChartJS.register(accuracyPlugin);

function ForecastChart({ actual, forecast, actualAccuracy }) {
  // Aggregates daily/dated arrays into monthly buckets (YYYY-MM)
  const groupByMonth = (arr, dateKey, valueKey) => {
  const map = {};
  (arr || []).forEach(d => {
    if (!d || !d[dateKey]) return;
    let dt = new Date(d[dateKey]);
    if (isNaN(dt.getTime())) {
      const parts = String(d[dateKey]).split("-");
      if (parts.length >= 2) dt = new Date(`${parts[0]}-${parts[1]}-01`);
      else return;
    }
    const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    map[monthKey] = map[monthKey] || [];
    const v = Number(d[valueKey]);
    if (!isNaN(v)) map[monthKey].push(v);
  });

  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, vals]) => ({
      Date: month,
      Value: vals.reduce((x, y) => x + y, 0)   // <-- FIXED: SUM (not average)
    }));
};


  const actualMonthly = groupByMonth(actual || [], "Date", "Actual");
  const forecastMonthly = groupByMonth(forecast || [], "Date", "Forecast_Units_Sold");

  // Union of months (so future months from forecast are included)
  const monthsSet = new Set();
  actualMonthly.forEach(d => monthsSet.add(d.Date));
  forecastMonthly.forEach(d => monthsSet.add(d.Date));
  const labels = Array.from(monthsSet).sort();

  const actualMap = Object.fromEntries(actualMonthly.map(d => [d.Date, d.Value]));
  const forecastMap = Object.fromEntries(forecastMonthly.map(d => [d.Date, d.Value]));

  // Align values with labels. Use null where a series has no value to create gap in Chart.js
  const actualValues = labels.map(l => actualMap.hasOwnProperty(l) ? actualMap[l] : null);
  const forecastValues = labels.map(l => forecastMap.hasOwnProperty(l) ? forecastMap[l] : null);

  const data = {
    labels,
    datasets: [
      {
        label: "Actual",
        data: actualValues,
        borderColor: "#3b82f6",
        backgroundColor: "transparent",
        pointRadius: 3,
        borderWidth: 2,
        tension: 0.2,
      },
      {
        label: "Prediction",
        data: forecastValues,
        borderColor: "#f59e0b",
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [6,6],
        pointRadius: 3,
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: { intersect: false, mode: "index" },
      // pass accuracy into the custom plugin via this key
      customCanvasText: {
        accuracy: actualAccuracy,
      },
    },
    scales: {
      x: { ticks: { autoSkip: true, maxTicksLimit: 12 } },
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3>Forecast Chart</h3>
      <Line data={data} options={options} />
    </div>
  );
}

function computeTrend(actualArr, forecastArr) {
  if (!forecastArr.length) return "flat";

  const A = actualArr.slice(-3).map(a => Number(a.Actual || 0));
  const F = forecastArr.slice(0, 3).map(f => Number(f.Forecast_Units_Sold || 0));

  if (!A.length || !F.length) return "flat";

  const avgA = A.reduce((a,b)=>a+b,0) / A.length;
  const avgF = F.reduce((a,b)=>a+b,0) / F.length;

  if (avgA === 0) return "flat";
  const change = ((avgF - avgA) / avgA) * 100;

  if (change > 5) return "up";
  if (change < -5) return "down";
  return "flat";
}

function computeConfidence(forecastRaw) {
  if (!forecastRaw.length) return "Low";

  const vals = forecastRaw.map(r => ({
    low: Number(r.yhat_lower || 0),
    high: Number(r.yhat_upper || 0)
  })).filter(v => v.high > 0);

  if (!vals.length) return "Low";

  const ratio = vals.map(v => v.low / v.high).reduce((a,b) => a+b, 0) / vals.length;

  if (ratio > 0.90) return "High";
  if (ratio > 0.75) return "Medium";
  return "Low";
}

export default function DemandForecastingApp() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState("upload");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);
  const [forecastRaw, setForecastRaw] = useState(null);   // full backend response
const [selectedProduct, setSelectedProduct] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [reorderPoints, setReorderPoints] = useState(null);
  const [lowInventory, setLowInventory] = useState([]);
  const [ropLoading, setRopLoading] = useState(false);
  const [seriesActual, setSeriesActual] = useState([]);
  const [seriesForecast, setSeriesForecast] = useState([]);

  // Handle Sign Out
  const handleSignOut = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    alert("Signed out successfully!");
    navigate("/");
  };

  // CSV Upload + Validation
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return alert("Please select a file");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("❌ Invalid file type. Please upload a CSV file only.");
      setUploadedFile(null);
      return;
    }

    setUploadedFile(file);
    setValidationStatus({ loading: true });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5002/api/data/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (response.ok) {
        setValidationStatus({
          complete: true,
          rows: result.totalRows,
          columns: result.headers?.length || 0,
          missing: result.missingValues,
          duplicates: 0,
          headers: result.headers,
          message: result.message,
        });
        setActiveView("validate");
      } else {
        setValidationStatus({
          error: true,
          message: result.message || "Validation failed",
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setValidationStatus({
        error: true,
        message: "Server not responding or upload failed",
      });
    }
  };

  // Generate Forecast (calls your backend)
const generateForecast = async () => {
  setActiveView("forecast");

  try {
    const res = await fetch("http://localhost:5002/api/data/forecast", { method: "POST" });
    const data = await res.json();

    setForecastRaw(data);

    const products = Object.keys(data.per_product || {});
    if (!products.length) {
      alert("No products found in forecast.");
      return;
    }

    setSelectedProduct(products[0]);
    loadProductForecast(products[0], data);

  } catch (e) {
    alert("Forecast failed.");
  }
};


  // Calculate ROP
  const calculateROP = async () => {
    setRopLoading(true);
    try {
      const response = await fetch("http://localhost:5002/api/data/calculate-rop");
      const result = await response.json();

      if (response.ok && result.reorderPoints) {
        setReorderPoints(result.reorderPoints);
        setLowInventory(result.lowInventory || []);
        alert(result.message);
      } else {
        alert("Failed to calculate ROP");
      }
    } catch (err) {
      console.error("ROP error:", err);
      alert("Server error while calculating ROP");
    } finally {
      setRopLoading(false);
    }
  };

  // CSV / PDF export helpers
  const exportCSV = (rows, filename) => {
    if (!rows || rows.length === 0) return alert("No data to export");
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportPDF = (rows, filename, title) => {
    if (!rows || rows.length === 0) return alert("No data to export");
    const doc = new jsPDF();
    doc.text(title, 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [Object.keys(rows[0])],
      body: rows.map(r => Object.values(r)),
    });
    doc.save(filename);
  };
  const loadProductForecast = (pid, full = forecastRaw) => {
  if (!full) return;

  const per = full.per_product[pid];
  if (!per) return;

  const actual = full.actual.filter(a => a.Product_ID === pid);
  const forecast = per.forecast;

  const normActual = actual.map(r => ({ Date: r.ds, Actual: r.y }));
  const normForecast = forecast.map(r => ({
    Date: r.ds,
    Forecast_Units_Sold: r.yhat,
    yhat_lower: r.yhat_lower,
    yhat_upper: r.yhat_upper
  }));

  setSeriesActual(normActual);
  setSeriesForecast(normForecast);

  const metrics = per.metrics;

  setForecastData({
    accuracy: metrics.accuracy ?? metrics.accuracy_pct ?? "N/A",
    trend: computeTrend(normActual, normForecast),
    nextMonth: Math.round(normForecast[0]?.Forecast_Units_Sold || 0),
    confidence: computeConfidence(forecast)
  });
};


  return (
    <div className={`app ${darkMode ? "dark" : ""}`}>
      <header className="header">
        <div className="container header-inner">
          <div className="header-left">
            <TrendingUp className="icon blue" />
            <h1>DFSBS Forecasting</h1>
          </div>
          <div className="header-right">
            <button onClick={() => setDarkMode(!darkMode)} className="icon-btn">
              {darkMode ? <Sun /> : <Moon />}
            </button>
            <div className="user-info">
              <User />
              <span>Admin</span>
            </div>
            <button className="icon-btn" onClick={handleSignOut} title="Sign Out">
              <LogOut />
            </button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="container nav-inner">
          {[
            { id: "upload", label: "Data Upload", icon: Upload },
            { id: "validate", label: "Validation", icon: Database },
            { id: "forecast", label: "Forecast", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`nav-tab ${activeView === tab.id ? "active" : ""}`}
            >
              <tab.icon className="nav-icon" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container main">
        {activeView === "upload" && (
          <section>
            <h2>Upload Historical Sales Data</h2>
            <p className="muted">Upload your CSV file containing historical sales data for analysis.</p>

            <div className="upload-box">
              <Upload className="icon-large muted" />
              <h3>Upload CSV File</h3>
              <p className="muted small">Drag and drop or click to browse</p>

              <input type="file" accept=".csv" onChange={handleFileUpload} id="file-upload" hidden />
              <label htmlFor="file-upload" className="btn-primary">Choose File</label>

              {uploadedFile && (
                <div className="file-chip">
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{uploadedFile.name}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {activeView === "validate" && (
          <section>
            <h2>Data Validation</h2>
            <p className="muted">Review data quality and completeness.</p>

            {validationStatus?.loading && (
              <div className="empty-state">
                <Database className="icon-large muted" />
                <p className="muted">Validating your CSV file...</p>
              </div>
            )}

            {validationStatus?.error && (
              <div className="card error-card">
                <AlertTriangle className="icon red" />
                <h3>Validation Error</h3>
                <p>{validationStatus.message}</p>
              </div>
            )}

            {validationStatus?.complete && (
              <>
                <div className="grid-2">
                  <div className="card">
                    <h3>Data Overview</h3>
                    <div className="stats">
                      <div><span className="muted">Total Rows</span><span>{validationStatus.rows}</span></div>
                      <div><span className="muted">Columns</span><span>{validationStatus.columns}</span></div>
                      <div><span className="muted">Missing Values</span><span className="warn">{validationStatus.missing}</span></div>
                      <div><span className="muted">Duplicates</span><span className="ok">{validationStatus.duplicates}</span></div>
                    </div>
                  </div>

                  <div className="card">
                    <h3>Validation Summary</h3>
                    <p>{validationStatus.message}</p>
                    <ul className="status-list">
                      {validationStatus.headers?.map((h, i) => (
                        <li key={i}><span className="dot ok"></span> {h}</li>
                      ))}
                    </ul>
                    <button className="btn-primary full" onClick={generateForecast}>
                      Store & Continue to Forecast
                    </button>
                  </div>
                </div>

                <div className="calculate-rop-container">
                  <button
                    className={`btn-primary ${ropLoading ? "loading" : ""}`}
                    onClick={calculateROP}
                  >
                    {ropLoading ? "⏳ Calculating..." : "📦 Calculate Reorder Points"}
                  </button>
                </div>

                {reorderPoints && (
                  <div className="rop-table mt-4">
                    <h4>📦 Inventory Reorder Points</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Product ID</th>
                          <th>Avg Daily Demand</th>
                          <th>Safety Stock</th>
                          <th>ROP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(reorderPoints).map(([pid, data]) => (
                          <tr key={pid}>
                            <td>{pid}</td>
                            <td>{data.averageDailyDemand}</td>
                            <td>{data.safetyStock}</td>
                            <td className="highlight">{data.reorderPoint}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {reorderPoints && (
                  <div className="low-inventory-alert mt-4">
                    <h4>🚨 Low-Inventory Alerts</h4>
                    <p className="muted small">
                      Products where <strong>Inventory Level</strong> is below their <strong>ROP</strong>.
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>Product ID</th>
                          <th>Inventory Level</th>
                          <th>Reorder Point</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowInventory.length > 0 ? (
                          lowInventory.map((item) => (
                            <tr key={item.productId} className="alert-row">
                              <td>{item.productId}</td>
                              <td>{item.inventoryLevel}</td>
                              <td>{item.reorderPoint}</td>
                              <td className="alert-text">⚠️ Low Inventory</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="ok-text">
                              ✅ All products are above their reorder thresholds.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeView === "forecast" && (
          <section>
            <h2>Demand Trend Dashboard</h2>
            <p className="muted">AI-generated demand forecasting analysis</p>
            {forecastRaw && (
  <select
    className="product-select"
    value={selectedProduct || ""}
    onChange={(e)=>{
      setSelectedProduct(e.target.value);
      loadProductForecast(e.target.value);
    }}
  >
    {Object.keys(forecastRaw.per_product).map(pid => (
      <option key={pid} value={pid}>{pid}</option>
    ))}
  </select>
)}


            {forecastData && !forecastData.error && (
              <>
                <div className="grid-4">
                  {[
                    { label: "Model Accuracy", value: forecastData.accuracy != null ? `${forecastData.accuracy}%` : "N/A", color: "blue" },
                    { label: "Trend Direction", value: forecastData.trend ?? "flat", color: "green" },
                    { label: "Next Month", value: forecastData.nextMonth != null ? `${forecastData.nextMonth}` : "N/A", color: "purple" },
                    { label: "Confidence", value: forecastData.confidence ?? "Low", color: "indigo" },
                  ].map((m, i) => (
                    <div key={i} className="card metric">
                      <p className="muted small">{m.label}</p>
                      <p className={`metric-value ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, marginBottom: 20, display: "flex", gap: "12px" }}>
                  <button className="btn-primary" onClick={() => exportCSV(seriesForecast, "forecast_future.csv")}>
                    Export Future CSV
                  </button>
                  <button className="btn-primary" onClick={() => exportCSV(seriesActual, "actual_data.csv")}>
                    Export Actual CSV
                  </button>

                  <button className="btn-primary" onClick={() => exportPDF(seriesForecast, "forecast_future.pdf", "Future Forecast")}>
                    Export Future PDF
                  </button>

                  <button className="btn-primary" onClick={() => exportPDF(seriesActual, "actual_data.pdf", "Actual Data")}>
                    Export Actual PDF
                  </button>
                </div>

                <ForecastChart
                  actual={seriesActual}
                  forecast={seriesForecast}
                  actualAccuracy={forecastData.accuracy}
                />
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
