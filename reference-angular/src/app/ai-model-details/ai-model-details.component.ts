import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-ai-model-details',
  templateUrl: './ai-model-details.component.html',
  styleUrls: ['./ai-model-details.component.scss']
})
export class AiModelDetailsComponent implements OnInit {

  @Input() modelKey = 'model_1';

  // switching between view trade signals or portfolios
  viewTypes = [];
  selectedViewType: {
    code: string,
    name: string
  };

  constructor() { }

  ngOnInit(): void {
    this.viewTypes = [
      {
        code: 'trade-signals',
        name: 'Trade Signals'
      },
      {
        code: 'portfolios',
        name: 'Portfolios'
      }
    ];

    this.selectedViewType = this.viewTypes[0];
  }

  onViewTypeChange(event) {
    this.selectedViewType = event.value;
  }
}
