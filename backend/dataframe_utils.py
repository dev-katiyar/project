from datetime import datetime
import pandas as pd


def getQuarterYear(row):
    return f"{int(row['year'])}-Q{int(row['quarter'])}"


def getMonthYear(row):
    return f"{int(row['year'])}-{row['month']}"


def getDict(df):
    if df is None or df.empty:
        return []
    
    df = df.dropna()
    
    if not df.empty and df.index[0] != 0:
        df = df.copy()
        df["date"] = df.index.strftime("%b %d, %Y")
    
    return df.to_dict('records')


def getDictWithNulls(df):
    if df is None or df.empty:
        return []
    
    if not df.empty and df.index[0] != 0:
        df = df.copy()
        df["date"] = df.index.strftime("%b %d, %Y")
    
    return df.to_dict('records')


def getPerfForDataFrame(df, columnName):
    # Create a copy to avoid modifying the original
    df = df.copy()
    
    first_row = df.iloc[0]
    last_year_date = datetime(first_row["date"].year - 1, 12, 31)
    new_row = pd.Series([last_year_date, first_row["mv"]], index=df.columns)
    df = pd.concat([df, new_row.to_frame().T], ignore_index=True)
    
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date")
    df = df.sort_index(axis=0)

    df['year'] = pd.DatetimeIndex(df.index).year
    df['month'] = pd.DatetimeIndex(df.index).strftime('%b')
    df['quarter'] = pd.DatetimeIndex(df.index).quarter
    df['quarter'] = df.apply(lambda row: getQuarterYear(row), axis=1)
    df['month'] = df.apply(lambda row: getMonthYear(row), axis=1)
    
    # Use updated frequency aliases
    df_month_change = df.resample('ME').last()
    df_quarter_change = df.resample('QE').last()
    df_year_change = df.resample('YE').last()

    for df_change in [df_month_change, df_quarter_change, df_year_change]:
        df_change['change'] = (df_change.mv.pct_change() * 100).round(2)

    df_month_change = df_month_change.dropna()
    df_month_change[columnName] = df_month_change["change"]
    df_month_change = df_month_change[[columnName, "month"]]

    df_quarter_change = df_quarter_change.dropna()
    df_quarter_change[columnName] = df_quarter_change["change"]
    df_quarter_change = df_quarter_change[[columnName, "quarter"]]

    df_year_change = df_year_change.dropna()
    df_year_change[columnName] = df_year_change["change"]
    df_year_change = df_year_change[[columnName, "year"]]

    return {
        "monthly": df_month_change,
        "yearly": df_year_change,
        "quarterly": df_quarter_change
    }


def mergePortfolioPerf(df, key, performance):
    if key in performance:
        df_merged = performance[key].copy()
        cols_to_drop = ['year_portfolio', 'month_portfolio', 'quarter_portfolio']
        cols_to_drop = [col for col in cols_to_drop if col in df_merged.columns]
        if cols_to_drop:
            df_merged = df_merged.drop(columns=cols_to_drop)
        df_merged = df_merged.join(df, lsuffix='_portfolio')
        performance[key] = df_merged
    else:
        performance[key] = df