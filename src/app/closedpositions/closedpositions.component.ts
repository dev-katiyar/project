import {
  Component,
  OnInit,
  Input,
  EventEmitter,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-closedpositions',
  templateUrl: './closedpositions.component.html',
  styleUrls: ['./closedpositions.component.css'],
})
export class ClosedpositionsComponent implements OnInit, OnChanges {
  @Input() closedpositions = [];
  @Output() public onSymbolClicked = new EventEmitter();

  constructor(private symbolPopupService: SymbolPopupService) {}

  ngOnInit(): void {}

  ngOnChanges(chanegs: SimpleChanges) {
    if (this.closedpositions) {
      this.closedpositions.sort((a, b) => (a['date'] < b['date'] ? 1 : -1));
    }
  }

  ShowSymbolChart(symbol) {
    this.onSymbolClicked.emit({
      value: symbol,
    });
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
