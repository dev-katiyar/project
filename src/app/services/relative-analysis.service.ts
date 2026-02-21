import { Injectable } from '@angular/core';
import { LiveService } from '../services/live.service';

@Injectable({
  providedIn: 'root'
})
export class RelativeAnalysisService {

  constructor(private liveService: LiveService) { }

  getRelativeAnalysisForPair(rel_analysis_inputs) {
    return this.liveService.postRequest('/relative-analysis', rel_analysis_inputs);
  }

  getRelativeAnalysisForAllSectors(rel_analysis_inputs) {
    return this.liveService.postRequest('/relative-analysis-sectors', rel_analysis_inputs);
  }

  getRelativeAbsoluteAnalysisForAllSectors(rel_abs_analysis_inputs) {
    return this.liveService.postRequest('/relative-absolute-analysis-sectors', rel_abs_analysis_inputs);
  }

  getEtfHoldings(symbol) {
    return this.liveService.getUrlData('/etf/holdings/' + symbol);
  }

  getRelativeAnalysisScoreText(score) {
    let text = "Neutral";

    if(score <= -0.75) {
      text = 'Very Oversold';
    } else if (score > -0.75 && score <= -0.25){
      text = 'Moderately Oversold';
    } else if (score >= 0.25 && score < 0.75) {
      text = 'Moderately Overbought';
    } else if (score >= 0.75) {
      text = 'Very Overbought';
    } 
  
    return text;
  }

  addDiffColumn(data, col1, col2) {
    for(let row of data) {
      row[col1 + '_' + col2 + '_diff'] = row[col1] - row[col2];
    }
    return data;
  }
}
 