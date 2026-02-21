import { Component, OnInit } from '@angular/core';
import { StrategyService } from '../services/strategy.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-strategy-ideas',
  templateUrl: './strategy-ideas.component.html',
  styleUrls: ['./strategy-ideas.component.scss']
})
export class StrategyIdeasComponent implements OnInit {

  savedStrategies;

  constructor(
    private strategyService: StrategyService,
    private router: Router) {
  }

  ngOnInit(): void {
    this.strategyService.getModelStrategies().subscribe(data => this.setPresetValues(data))
  }

  setPresetValues(data) {
    this.savedStrategies = data;
  }

  onRunClicked(item) {
    this.router.navigate(['sv-builder', { id: item['id'] }]);
  }

}

