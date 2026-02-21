import { Component, Input, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { DomSanitizer } from '@angular/platform-browser';
import { SymbolPopupService } from '../symbol-popup.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

// import { Tree } from 'primeng/tree';
// import { TreeNode } from 'primeng/api';

@Component({
  selector: 'app-ai-agent-decisions',
  templateUrl: './ai-agent-decisions.component.html',
  styleUrls: ['./ai-agent-decisions.component.scss'],
})
export class AiAgentDecisionsComponent implements OnInit {
  @Input() symbol = 'AAPL';

  // related to org chart UI
  // orgChartData: TreeNode[] = [];
  // selectedNode;

  // related to Card and Tab Panel UI
  rawData = {};
  combinedDecision: any = {};

  agentDecisions = {};
  agentDecisionsListHumans = [];
  agentDecisionsListNotHumans = [];
  nonHumanAgentNames = [
    'fundamentals_agent',
    'sentiment_agent',
    'technical_analyst_agent',
    'valuation_agent',
  ];

  // Selected Individual Descision
  selectedAgentDecision: any = {};

  // Utils
  signalMap = {
    buy: 'Bullish',
    hold: 'Neutral',
    sell: 'Bearish',
    short: 'Bearish',
  };

  // agent descriptionis
  agentDescriptions = {};

  // dial related
  dscnBaseValues = {
    bearish: 0,
    neutral: 150,
    bullish: 200,
  };

  confidenceAdjMap = {
    bullish: 1,
    bearish: -1,
    neutral: 0,
  };

  constructor(
    private liveService: LiveService,
    public sanitiser: DomSanitizer,
    private symbolPopupService: SymbolPopupService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const symbol = params['symbol'];

      if (symbol) {
        this.symbol = symbol;
      }
    });

    this.loadAiDecisionsForSymbol(this.symbol);
  }

  ngOnChanges(changes) {
    //  in caes, we use this component as tag and data is loaded when Input (symbol) changes
    if (changes.symbol && changes.symbol.currentValue) {
      this.loadAiDecisionsForSymbol(changes.symbol.currentValue);
    }
  }

  loadAiDecisionsForSymbol(symb) {
    this.symbol = symb;
    this.getAiAgentDecisions();
  }

  resetLocalVars() {
    this.combinedDecision = {};
    this.agentDecisions = {};
    this.agentDecisionsListHumans = [];
    this.agentDecisionsListNotHumans = [];
    this.rawData = {};
  }

  getAiAgentDecisions() {
    this.resetLocalVars();
    const url = `/ai-agents/decisions/${this.symbol}`;
    const obsv1 = this.liveService.getUrlData(url);
    const obsv2 = this.liveService.getUrlData('/ai-agents/descriptions');
    forkJoin([obsv1, obsv2]).subscribe(results => {
      this.rawData = results[0];
      this.agentDescriptions = results[1];
      this.prepareDataForUI();
    });
  }

  prepareDataForUI() {
    const combinedDecision = this.rawData['combined_decision'];
    this.prepareCombiniedDecisionData(combinedDecision);

    const agentDecisions = this.rawData['analyst_signals'];
    this.prepareIndividuaDecisionData(agentDecisions);

    this.selectedAgentDecision = Object.values(this.agentDecisionsListHumans)[0];
  }

  prepareCombiniedDecisionData(combDcsn) {
    this.combinedDecision = combDcsn;
    // change Buy/Sell to Bullish/Bearish
    const action = combDcsn['action'];
    const newAction: string = this.signalMap[action] ?? 'Error';
    this.combinedDecision['signal'] = newAction;

    // set class for the div based on action
    this.combinedDecision['signalClass'] = newAction.toLowerCase();

    // set class for the div based on confidence
    const confidence = combDcsn['confidence'];
    let confidenceClass = 'neutral';
    if (confidence > 66) {
      confidenceClass = 'bullish';
    } else if (confidence < 33) {
      confidenceClass = 'bearish';
    }
    this.combinedDecision['confidenceClass'] = confidenceClass;

    this.combinedDecision['dataPoint'] = this.createDataPoint(this.combinedDecision);
  }

  prepareIndividuaDecisionData(agentDcsns: any) {
    this.agentDecisions = agentDcsns;
    const commonFields = ['name', 'confidence', 'signal', 'description', 'dataPoint'];

    for (const [name, dcsn] of Object.entries(this.agentDecisions)) {
      if (name == 'risk_management_agent') {
        continue;
      }
      dcsn['name'] = this.formatAgentName(name);
      dcsn['description'] = this.agentDescriptions[name]?.description;
      dcsn['dataPoint'] = this.createDataPoint(dcsn);
      dcsn['superInvestorCode'] = this.agentDescriptions[name]?.code;

      const reson = dcsn.hasOwnProperty('reasoning') ? dcsn['reasoning'] : null;

      // prepare reasoning
      if (typeof reson == 'object' || reson == null) {
        let reasoning = '';

        for (const key in dcsn as any) {
          if (!commonFields.includes(key)) {
            reasoning += this.objectToHtmlTable(dcsn[key]);
          }
        }

        dcsn['reasoning'] = reasoning;
      }

      // reasoning is already a text, take as is
      if (this.nonHumanAgentNames.includes(name)) {
        this.agentDecisionsListNotHumans.push(dcsn);
      } else {
        this.agentDecisionsListHumans.push(dcsn);
      }
    }
  }

  objectToHtmlTable(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }

    const table = document.createElement('table');
    // table.style.border = '1px solid black';
    table.style.borderCollapse = 'collapse';

    for (const [key, value] of Object.entries(obj)) {
      const row = table.insertRow();
      const keyCell = row.insertCell();
      const valueCell = row.insertCell();

      keyCell.style.border = '1px solid lightgrey';
      valueCell.style.border = '1px solid lightgrey';
      keyCell.style.padding = '5px';
      valueCell.style.padding = '5px';
      keyCell.style.width = '33%';
      valueCell.style.width = '67%';
      keyCell.style.textTransform = 'capitalize';
      valueCell.style.textTransform = 'capitalize';

      keyCell.textContent = this.formatAgentName(key);

      if (typeof value === 'object' && value !== null) {
        valueCell.innerHTML = this.objectToHtmlTable(value);
      } else {
        const formattedValue = this.formatValue(value);
        valueCell.textContent = formattedValue as string;
        if (['bullish', 'bearish', 'neutral'].includes(formattedValue)) {
          row.classList.add(formattedValue + '-nbg');
          valueCell.classList.add(formattedValue);
        }
      }
    }

    return table.outerHTML;
  }

  // Helper function to format values
  formatValue(value: any): any {
    // Check if value is a string that can be converted to a number
    if (typeof value === 'string' && !isNaN(Number(value))) {
      const number = Number(value);
      // Check if it has decimal places
      if (number % 1 !== 0 && (number > 0.01 || number < -0.01)) {
        return Number(number.toFixed(2));
      }
      return number;
    }

    if (typeof value === 'number' && (value > 0.01 || value < -0.01)) {
      return Number(value.toFixed(2));
    }
    return value;
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

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }

  createDataPoint(dscn) {
    // { y: 150, descision: 'Neutral', confidence: 50 } - expected format
    const decision = dscn['signal'].toLowerCase();
    const confidence = dscn['confidence'];
    const confidenceAdj =
      decision !== 'bearish'
        ? dscn['confidence'] * this.confidenceAdjMap[decision]
        : dscn['confidence'] * this.confidenceAdjMap[decision] + 100;
    const baseValue = this.dscnBaseValues[decision];

    return {
      y: baseValue + confidenceAdj,
      descision: decision,
      confidence: confidence,
    };
  }

  onAgentNameClick(dscn) {
    this.selectedAgentDecision = dscn;
  }

  onSymbolSelected(event) {
    this.loadAiDecisionsForSymbol(event.value);
  }
}
