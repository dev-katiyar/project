import pandas as pd


def camarilla(df):
    o = df.open.values
    h = df.high.values
    l = df.low.values
    c = df.close.values
    p = (h + l + c) / 3
    r1 = c + ((h - l) * 1.083)
    r2 = c + ((h - l) * 1.166)
    r3 = c + ((h - l) * 1.25)
    s1 = c - ((h - l) * 1.083)
    s2 = c - ((h - l) * 1.166)
    s3 = c - ((h - l) * 1.25)

    return (p, r1, r2, r3, s1, s2, s3)


def fibonacii(df):
    o = df.open.values
    h = df.high.values
    l = df.low.values
    c = df.close.values
    p = (h + l + c) / 3
    r1 = p + (0.382 * (h - c))
    r2 = p + (0.618 * (h - c))
    r3 = p + (1 * (h - c))
    s1 = p - (0.382 * (h - c))
    s2 = p - (0.618 * (h - c))
    s3 = p - (1 * (h - c))
    return (p, r1, r2, r3, s1, s2, s3)


def woodie(df):
    o = df.open.values
    h = df.high.values
    l = df.low.values
    c = df.close.values
    p = ((h + l + 2 * c) / 4)
    r1 = (2 * p) - l
    r2 = (p + h - l)
    r3 = h + 2 * (p - l)
    s1 = (2 * p) - h
    s2 = p - h + l
    s3 = l - 2 * (h - p)
    return (p, r1, r2, r3, s1, s2, s3)


def classic(df):
    o = df.open.values
    h = df.high.values
    l = df.low.values
    c = df.close.values
    p = ((h + l + c) / 3)
    r1 = (2 * p) - l
    r2 = (p + h - l)
    r3 = (h + 2 * (p - l))
    s1 = (2 * p) - h
    s2 = p - h + l
    s3 = l - 2 * (h - p)
    return (p, r1, r2, r3, s1, s2, s3)


def calculatePivotPoints(df):
    if len(df.index) > 0:
        columns = ["close", "high", "low", "open"]
        df = df[columns]
        frames = []
        df['p'], df['r1'], df['r2'], df['r3'], df['s1'], df['s2'], df['s3'] = camarilla(df)
        df['name'] = 'Camarilla'
        frames.append(df.tail(1))
        df['p'], df['r1'], df['r2'], df['r3'], df['s1'], df['s2'], df['s3'] = woodie(df)
        df['name'] = 'Woodie'
        frames.append(df.tail(1))
        df['p'], df['r1'], df['r2'], df['r3'], df['s1'], df['s2'], df['s3'] = fibonacii(df)
        df['name'] = 'Fibonacci'
        frames.append(df.tail(1))
        df['p'], df['r1'], df['r2'], df['r3'], df['s1'], df['s2'], df['s3'] = classic(df)
        df['name'] = 'Classic'
        frames.append(df.tail(1))
        df_final = pd.concat(frames)
        return df_final.to_dict('records')
    else:
        return []
