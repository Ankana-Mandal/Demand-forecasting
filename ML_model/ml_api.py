# ml_api.py
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from forecast_engine import evaluate_and_forecast_product

app = FastAPI(title="DFSBS Forecast API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

def safe_read_csv(bytes_io):
    bytes_io.seek(0)
    try:
        return pd.read_csv(bytes_io)
    except:
        bytes_io.seek(0)
        return pd.read_csv(bytes_io, engine="python")

@app.post("/forecast")
async def forecast(
    file: UploadFile = File(...),
    datecol: str = Form("Date"),
    target: str = Form("Units_Sold"),
    horizon: int = Form(6),
    freq: str = Form("M"),
    product_col: str = Form("Product_ID")
):

    raw_bytes = await file.read()
    df = safe_read_csv(io.BytesIO(raw_bytes))

    # COLUMN CHECK
    for col in [datecol, target, product_col]:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing column {col}")

    df[datecol] = pd.to_datetime(df[datecol], errors="coerce")
    df = df.dropna(subset=[datecol])
    df[target] = pd.to_numeric(df[target], errors="coerce").fillna(0)
    df[product_col] = df[product_col].astype(str)

    products = sorted(df[product_col].unique())
    per_product = {}
    actual_all = []
    forecast_future_all = []
    summary_list = []
    skipped = {}

    for pid in products:
        subdf = df[df[product_col] == pid]

        metrics, forecast_df, test_preds = evaluate_and_forecast_product(
            subdf,
            date_column=datecol,
            target_column=target,
            periods=int(horizon),
            freq=freq,
            min_points=6
        )

        if metrics.get("skipped"):
            skipped[pid] = metrics["reason"]
            continue

        per_product[pid] = {"metrics": metrics}

        # FUTURE FORECAST (monthly)
        for _, row in forecast_df.iterrows():
            forecast_future_all.append({
                "Product_ID": pid,
                "ds": row["ds"],
                "yhat": float(row["yhat"]),
                "yhat_lower": float(row["yhat_lower"]),
                "yhat_upper": float(row["yhat_upper"]),
            })

        # ACTUAL — monthly sum
        monthly_actual = subdf.set_index(datecol)[target].resample("M").sum().reset_index()
        for _, row in monthly_actual.iterrows():
            actual_all.append({
                "Product_ID": pid,
                "ds": row[datecol].strftime("%Y-%m-%d"),
                "y": float(row[target])
            })

        summary_list.append({
            "Product_ID": pid,
            "accuracy_pct": metrics["accuracy"]
        })

        per_product[pid]["forecast"] = [
            {
                "ds": r["ds"],
                "yhat": float(r["yhat"]),
                "yhat_lower": float(r["yhat_lower"]),
                "yhat_upper": float(r["yhat_upper"]),
            }
            for _, r in forecast_df.iterrows()
        ]

    return {
        "summary": {"per_product": summary_list},
        "actual": actual_all,
        "forecast_future": forecast_future_all,
        "per_product": per_product,
        "skipped": skipped,
    }
