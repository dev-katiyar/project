import { Injectable } from '@angular/core';
import { LiveService } from '../services/live.service';

@Injectable({
  providedIn: 'root',
})
export class AbsoluteAnalysisService {
  constructor(private liveService: LiveService) {}

  getAbsoluteAnalysisForSymbol(abs_analysis_inputs) {
    return this.liveService.postRequest('/absolute-analysis', abs_analysis_inputs);
  }

  getAbsoluteAnalysisForAllSectors(abs_analysis_inputs) {
    return this.liveService.postRequest('/absolute-analysis-sectors', abs_analysis_inputs);
  }

  getAbsoluteAnalysisScoreText(score) {
    let text = 'Neutral';

    if (score <= -0.75) {
      text = 'Very Oversold';
    } else if (score > -0.75 && score <= -0.25) {
      text = 'Moderately Oversold';
    } else if (score >= 0.25 && score < 0.75) {
      text = 'Moderately Overbought';
    } else if (score >= 0.75) {
      text = 'Very Overbought';
    }

    return text;
  }
}
