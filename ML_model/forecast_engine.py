# forecast_engine.py
import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.metrics import mean_squared_error

EPS = 1e-8

def evaluate_and_forecast_product(
    df, date_column, target_column, periods=6, freq="M", min_points=10
):
    """
    df: DataFrame for a single product containing date_column and target_column
    Returns:
      - metrics: dict
      - monthly_future: DataFrame with ds, yhat, yhat_lower, yhat_upper
      - test_preds
    """
    # CLEAN DATA
    data = df[[date_column, target_column]].dropna().copy()
    data = data.rename(columns={date_column: "ds", target_column: "y"})
    data["ds"] = pd.to_datetime(data["ds"], errors="coerce")
    data = data.dropna(subset=["ds"]).sort_values("ds").reset_index(drop=True)

    # NOT ENOUGH POINTS
    if len(data) < min_points:
        return {"skipped": True, "reason": f"Not enough points ({len(data)})"}, None, None

    # TRAIN / TEST SPLIT
    n = len(data)
    train_end = int(n * 0.8)
    train = data.iloc[:train_end].reset_index(drop=True)
    test = data.iloc[train_end:].reset_index(drop=True)

    # TRAIN MODEL
    try:
        m = Prophet(
            seasonality_mode="additive",
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False
        )
        m.fit(train)
    except Exception as e:
        return {"skipped": True, "reason": f"Prophet fit error: {str(e)}"}, None, None

    # TEST PREDICTION
    try:
        future_test = m.make_future_dataframe(periods=len(test), freq="D")
        pred = m.predict(future_test).tail(len(test))

        test_preds = pd.DataFrame({
            "ds": test["ds"],
            "y_true": test["y"],
            "y_pred": pred["yhat"]
        })

        y_true = test_preds["y_true"].to_numpy(dtype=float)
        y_pred = test_preds["y_pred"].to_numpy(dtype=float)

        mape = np.mean(np.abs((y_true - y_pred) / (np.abs(y_true) + EPS))) * 100.0
        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        accuracy = max(0.0, 100.0 - mape)

    except Exception:
        test_preds = None
        mape = float("nan")
        rmse = float("nan")
        accuracy = None

    metrics = {
        "mape": None if np.isnan(mape) else float(mape),
        "rmse": None if np.isnan(rmse) else float(rmse),
        "accuracy": accuracy,
        "train_points": len(train),
        "test_points": len(test)
    }

    # FUTURE FORECAST (MONTHLY SUM)
    try:
        m_full = Prophet(
            seasonality_mode="additive",
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False
        )
        m_full.fit(data)

        full_future = m_full.make_future_dataframe(periods=periods * 30, freq="D")
        fc_full = m_full.predict(full_future)

        fc_full["ds"] = pd.to_datetime(fc_full["ds"])
        fc_full = fc_full.set_index("ds")

        monthly_fc = fc_full[["yhat", "yhat_lower", "yhat_upper"]].resample("M").sum()

        monthly_future = monthly_fc.tail(periods).reset_index()
        monthly_future["ds"] = monthly_future["ds"].dt.strftime("%Y-%m-%d")

    except Exception as e:
        return {"skipped": True, "reason": f"Full forecast error: {str(e)}"}, None, test_preds

    return metrics, monthly_future, test_preds
