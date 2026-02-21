import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import regression from 'regression';

@Injectable()
export class TechnicalService {

  constructor(private http: HttpClient) { }

  getRatingText(rating) {
    if (rating >= 8) {
      return "VeryStrong";
    }
    else if (rating >= 6 && rating < 8) {
      return "Strong";
    }
    else if (rating >= 4 && rating < 6) {
      return "Neutral";
    }
    else if (rating >= 2 && rating < 4) {
      return "Weak";
    }
    else {
      return "VeryWeak";
    }
  }

  getRsiText(value) {
    let rsi_text = "Neutral";
    if (value < 20) {
      rsi_text = 'ExtremelyOversold'
    }

    else if (value >= 20 && value <= 30) {

      rsi_text = 'Oversold'
    }
    else if (value > 30 && value <= 45) {

      rsi_text = 'ApproachingOversold'
    }
    else if (value > 45 && value <= 55) {
      rsi_text = 'Neutral'
    }
    else if (value > 55 && value <= 70) {

      rsi_text = 'ApproachingOverbought'
    }
    else if (value > 70 && value <= 80) {

      rsi_text = 'Overbought'
    }
    else if (value > 80) {

      rsi_text = 'ExtremelyOverbought'
    }
    else {
      rsi_text = "Neutral"
    }
    return rsi_text;
  }

  getZacksRatingBackground(value) {
    let styles = {
      'color': '#fff',
      'text-shadow': '0 -1px 1px rgba(0,0,0,.9)',
      'background-color': value >= 4 ? '#e10d0d' : value == 3 ? 'grey' : '#00ad13',
      'width': '18px',
      'font-weight': '600',
      'border': '1px solid black',
      'border-radius': '3px',
      'line-height': 1.4,
      'margin-left': '35%',
      'text-align': 'center'
    };
    return styles;
  }

  getPiotroskiRatingBackground(value) {
    let styles = {
      'color': '#fff',
      'text-shadow': '0 -1px 1px rgba(0,0,0,.9)',
      'background-color': value <= 3 ? '#e10d0d' : value >= 4 && value <= 6 ? 'grey' : '#00ad13',
      'width': '18px',
      'font-weight': '600',
      'border': '1px solid black',
      'border-radius': '3px',
      'line-height': 1.4,
      'margin-left': '35%',
      'text-align': 'center'
    };
    return styles;
  }

  getMohanramRatingBackground(value) {
    let styles = {
      'color': '#fff',
      'text-shadow': '0 -1px 1px rgba(0,0,0,.9)',
      'background-color': value <= 3 ? '#e10d0d' : value >= 4 && value <= 6 ? 'grey' : '#00ad13',
      'width': '18px',
      'font-weight': '600',
      'border': '1px solid black',
      'border-radius': '3px',
      'line-height': 1.4,
      'margin-left': '35%',
      'text-align': 'center'
    };
    return styles;
  }

  getZacksToolTip() {
    return "The SV Rank rates stocks in terms of their expected price performance over the next three to six months.The ranking system uses a quantitative model based on trends in estimate revisions and EPS surprises.Stocks are ranked from 1 to 5, with a <span style='color:green;font-weight:bold;'>1</span> being the best rank <span style='color:green;'>(strong buy)</span>, and a <span style='color:red;font-weight:bold;'>5</span> being the worst <span style='color:red;'>(strong sell)</span>."
  }

  getMohanramToolTip() {
    return "Scored <span style='color:red;font-weight:bold;'>0</span> <span style='color:red;'>(Worst)</span>) through <span style='color:#5E8F32;font-weight:bold;'>8</span> <span style='color:#5E8F32;'>(Best)</span>. Uses 8 factors to determine a company's financial strength in earnings and cash flow profitability, naive extrapolation and accounting conservatism."
  }

  getPiotroskiToolTip() {
    return "Scored <span style='color:red;font-weight:bold;'>0</span> <span style='color:red;'>(Worst)</span> through <span style='color:#5E8F32;font-weight:bold;'>9</span> <span style='color:#5E8F32;'>(Best)</span>. Uses 9 factors to determine a company's financial strength in profitability, financial leverage and operating efficiency."
  }

  getBulkAddToolTip() {
    return "Use this button to add list of symbols on the go.<br></br><span style='color:red;font-weight:bold;'>important!</span> <span style='color:#424242;'> Always add valid symbols separated by commas.</span> "
  }

  getImportCsvToolTip() {
    return "Use this button to import a CSV File.<br></br><span style='color:red;font-weight:bold;'>important!</span><span style='color:#424242;'>The file should have columns Symbol, Quantity and Price seperated by comma. </span> "
  }

  getUpDownImgByValue(value) {
    if (value > 5)
      return "../assets/images/thumsUp.png";
    else
      return "../assets/images/thumsDown.png";
  }

  getUpDownImgByText(text) {
    if (text == 'Buy' || text == 'Oversold')
      return "../assets/images/thumsUp.png";
    else if (text == 'Sell' || text == 'Overbought')
      return "../assets/images/thumsDown.png";
    else
      return "../assets/images/thumsDown.png";
  }

  getcolor(text) {
    if (text == 'buy') {
      return 'green';
    }
    else if (text == 'sell') {
      return '#FF120A';
    }
    else if (text == 'hold') {
      return 'yellow';
    }
  }

  getBuySellColor(text) {
     let classes = {
          'up': text == "Strong Buy",
          'down': text == "Strong Sell"
        };
        return classes;
  }

  getRatingBackground(value) {
    let myStyles = {
      'height': "20px",
      'background': this.getcolor(value),
      'width': value * 10 + "%"
    };
    return myStyles;
  }

  getRatingBackgroundNumeric(value) {
    let myStyles = {
      'height': '20px',
      'background': '#0077BD',
      'width': value * 10 + '%'
    };
    return myStyles;
  }

  getInsiderBackground(text) {
    let classes = {
      'up': text == "Open Market Purchase",
      'down': text == "Open Market Sale"
    };
    return classes;
  }

  setTabClass(value) {
    let classes = {
      'tabItem-green': value >= 0,
      'tabItem-red': value < 0
    };
    return classes;
  }

  setImageClass(value) {
    let classes = {
      'arrow-up': value > 0,
      'arrow-down': value < 0,
      'center': true
    };
    return classes;
  }

  getSMATooltip(smaDays) {
    return `${smaDays} Day SMA (% distance from Last Price). Formula used for distance is (Last Price - ${smaDays} SMA) / ${smaDays} SMA). Negative distance generally indicates downtrend and Positive distance generally indicate uptrend.`;
  }

  getRegressionLine(data: {x: number, y: number}[]) {
      const options = {
        order: 2,
        precision: 15
      }
      return regression.linear(data, options);
      /* Props: https://www.npmjs.com/package/regression
        equation: an array containing the coefficients of the equation
        string: A string representation of the equation
        points: an array containing the predicted data in the domain of the input
        r2: the coefficient of determination (R2)
        predict(x): This function will return the predicted value 
      */
  }
// to get color between two ranges, like light red to dark red
getRGBColorPercentage(colorStart, colorEnd, percentage) {
  let result = [];
  for (let i=0; i < 3; i++) {
    let start = colorStart[i];
    let end = colorEnd[i];
    let offset = (start - end) * percentage;
    result.push(start - offset);
  }

  return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
}
}
