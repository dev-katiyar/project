import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { SymbolPopupService } from '../symbol-popup.service';

@Component({
  selector: 'app-screens-summary',
  templateUrl: './screens-summary.component.html',
  styleUrls: ['./screens-summary.component.scss']
})
export class ScreensSummaryComponent implements OnInit, OnChanges {

  // display screens summary data
  @Input() isMinimalView = false;
  @Input() screenSummData;
  
  // on run screen click / screen specific detaisl
  @Output() runScreenClick = new EventEmitter();
  @Input() selectedPreset;
  
  // create new screen
  @Input() showCreateScreen = false;
  
  constructor(private symbolPopupService: SymbolPopupService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

  }

  onRunScreenClick(preset) {
    this.selectedPreset = preset; // highlight the selection. 
    this.runScreenClick.emit(preset); // tell parent about selection and set minimal view
  }

  onNewScreenClick() {

  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
