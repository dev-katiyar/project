import { Component, Output, Input, EventEmitter } from '@angular/core';
import { LiveService } from '../../services/live.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-stocks-autocomplete',
  templateUrl: './stocks-autocomplete.component.html',
  styleUrls: ['./stocks-autocomplete.component.css'],
})
export class StocksAutocompleteComponent {
  timer;
  selected = { symbol: '' };
  items;
  selectedItem;
  isSelected = true;
  @Output() public onSymbolSelected = new EventEmitter();
  @Input() searchText: string;
  @Input() placeholderText = 'Search';
  @Input() inputSize = 35; // number of characters
  @Input() isFullWidth: false;
  @Output() searchTextChange = new EventEmitter<string>();
  @Input() urlModifier: string = '';

  constructor(private liveService: LiveService, private notificationService: NotificationService) {}

  ngOnInit() {}

  selectionChanged(item) {
    this.searchText = item.symbol;
    this.selectedItem = item;
    this.sendEvent();
  }

  handleBlur() {
    this.timer = setTimeout(() => {
      this.isSelected = true;
    }, 2000);
  }

  handleKeyUp(event) {
    if (this.searchText && this.searchText != '') {
      this.searchText = this.searchText.toUpperCase();
      if (event.keyCode == 13) {
        this.sendEvent();
      } else {
        if (this.timer) {
          clearTimeout(this.timer);
          //this.timer = null
        }
        this.timer = setTimeout(() => {
          this.handleServerRequest();
        }, 500);
        this.searchTextChange.emit(this.searchText);
      }
    }
  }

  handleServerRequest() {
    let url = '/search' + this.urlModifier + '/';
    this.liveService.getUrlData(url + this.searchText).subscribe((d: any[]) => {
      this.isSelected = false;
      this.items = d.slice(0, 7);
    });
  }

  sendEvent() {
    this.isSelected = true;
    this.onSymbolSelected.emit({
      value: this.searchText,
      name: this.selectedItem.name,
    });
    this.searchTextChange.emit(this.searchText);
    localStorage.setItem('currentSymbol', this.searchText);
    this.notificationService.changeSelectedSymbol(this.searchText);
  }
}
