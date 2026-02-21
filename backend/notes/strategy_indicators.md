
/strategy/indictors GET
/strategy/inputs POST

list_indicators [macd,rsi,sma]  + (Add New)


left_option{setting}  operator right_option{setting}


// MACD
macd {26,12,9}  ca signal     ===>      macd {}      (v)  
macd {26,12,9}  cb signal
macd {40,30,9}  BuD N/A
macd {26,12,9}  BeD N/A


RSI {14} >= > = <= 30
sma {20} crosses over price
sma {200} crosses over sma{100}
sma {200} crosses over ema{100}

macd_indicator.py

case :
CO
CB
Bulli
Bearisj


sma_indicator.py

     CO


     [ (con1 & cond2) or  (con3 & cond4)]


Long :   (+) indicator DD  // long_indicators

------------------------------

+  macd co sginal   indObj1
   MoneyFlow        indObj2

-------------OR---------------


+ sma 20 co sma200  indObj3
  sma150 co price   indObj4
  rsi > 30          indObj5

------------------------------

// long_indicators //
[

{
"and":[{indObj1},{indObj2}]]}
},
{
"and":[{indObj3},{indObj4},{indObj5}]]}
}

]


Strategy=====>
{
"symbol":"MSFT",
"date":"",
"long_indicators":[]
"short_indicators":[]
}














