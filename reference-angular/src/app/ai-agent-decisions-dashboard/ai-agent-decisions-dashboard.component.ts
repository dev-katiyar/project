import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-ai-agent-decisions-dashboard',
  templateUrl: './ai-agent-decisions-dashboard.component.html',
  styleUrls: ['./ai-agent-decisions-dashboard.component.scss'],
})
export class AiAgentDecisionsDashboardComponent implements OnInit {
  allAgentsSummData: any = {};
  combined = [];

  // need for 3 sections of table
  agentHumans = [];
  agentNonHumans = [];
  agentNonHumanNames = [
    'fundamentals_agent',
    'sentiment_agent',
    'technical_analyst_agent',
    'valuation_agent',
  ];

  // selected agent for Symbol List Table
  selectedAgent: any;
  selectedSignal = '';
  // symbol for Agent - Signal Combo
  agentSymbols: any[] = [];

  // mapping
  signalMap = {
    buy: 'Bullish',
    hold: 'Neutral',
    sell: 'Bearish',
    short: 'Bearish',
  };

  constructor(private liveService: LiveService, private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {
    this.getAgentsSummaryData();
  }

  getAgentsSummaryData() {
    const url = '/ai-agents/summary';
    this.liveService.getUrlData(url).subscribe(data => {
      this.allAgentsSummData = data;
      this.prepareDataForUI();
      this.setDataForSymbolTable(this.combined[0], 'bullish');
    });
  }

  prepareDataForUI() {
    const combinedDescision = this.allAgentsSummData['combined_decision'];

    this.prepareCombined(combinedDescision);
    this.prepareIndividualAgents(this.allAgentsSummData);
  }

  prepareCombined(combSumm) {
    this.combined = [
      {
        key: 'combined_decision',
        name: 'Overall Descision',
        bullish: combSumm['buy'],
        bearish: combSumm['short'],
        neutral: combSumm['hold'],
      },
    ];
  }

  prepareIndividualAgents(allAgents) {
    // for each agent summary
    for (const [agentKey, agentSumm] of Object.entries(allAgents)) {
      // ignore combined
      if (agentKey == 'combined_decision') {
        continue;
      }

      const agentRow = {
        key: agentKey,
        name: this.formatAgentName(agentKey),
        bearish: agentSumm['bearish'],
        bullish: agentSumm['bullish'],
        neutral: agentSumm['neutral'],
      };

      if (this.agentNonHumanNames.includes(agentKey)) {
        this.agentNonHumans.push(agentRow);
      } else {
        this.agentHumans.push(agentRow);
      }
    }
  }

  formatAgentName(name: string): string {
    // Remove '_agent' suffix
    const nameWithoutAgent = name.replace(/_agent$/, '').replace('analyst', '');

    // Split by underscore, capitalize each word, then join with space
    return nameWithoutAgent
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  setDataForSymbolTable(agent, signal) {
    this.selectedAgent = agent;
    this.selectedSignal = signal;

    this.agentSymbols = [];

    const url = `/ai-agents/agent-dec-symbols/${agent.key}/${signal}`;

    this.liveService.getUrlData(url).subscribe(data => {
      this.agentSymbols = data as any[];
      if (agent.key == 'combined_decision') {
        this.agentSymbols = this.prepareCombinedDescionForSymbolListTable(this.agentSymbols);
      }
    });
  }

  prepareCombinedDescionForSymbolListTable(combinedList) {
    for (let item of combinedList) {
      item.signal = this.mapCombinedDecision(item.signal);
    }

    return combinedList;
  }

  mapCombinedDecision(signal) {
    return this.signalMap[signal];
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
