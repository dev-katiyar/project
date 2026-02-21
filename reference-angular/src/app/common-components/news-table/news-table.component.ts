import { Component, OnInit, Input, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import { NewsService } from '../../services/news.service';
import { SymbolPopupService } from 'src/app/symbol-popup.service';

@Component({
  selector: 'app-news-table',
  templateUrl: './news-table.component.html',
  styleUrls: ['./news-table.component.css'],
})
export class NewsTableComponent implements OnInit {
  news;
  @Input() symbols;
  @Input() title = 'Portfolio News';
  @Input() newsClass = 'news';
  constructor(private newsService: NewsService, private symbolPopupService: SymbolPopupService) {}

  ngOnInit() {}
  ngOnChanges(changes: SimpleChanges) {
    this.news = [];
    if (this.symbols != null && this.symbols.length > 0) {
      let requestSymbol = this.symbols[0];
      if (requestSymbol != '') {
        this.newsService.getNewsForSymbol(requestSymbol).subscribe(d => {
          this.news = d;
          this.news.map(n => (n['date_raw'] = Date.parse(n['date_raw'])));
        });
      }
    }
  }

  onSymbolClick(symbol) {
    this.symbolPopupService.showPopup(symbol);
  }
}
