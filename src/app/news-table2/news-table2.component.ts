import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { NewsService } from '../services/news.service';

@Component({
  selector: 'app-news-table2',
  templateUrl: './news-table2.component.html',
  styleUrls: ['./news-table2.component.scss']
})
export class NewsTable2Component implements OnInit, OnChanges {

  @Input() symbols;
  @Input() title = "Portfolio News";
  @Input() newsClass = "news";

  news;
  
  constructor(private newsService: NewsService) { }

  ngOnInit() {
  }
  
  ngOnChanges(changes: SimpleChanges) {
    this.news = [];
    if (this.symbols != null && this.symbols.length > 0) {
      let requestSymbol = this.symbols[0];
      if (requestSymbol != "") {
        this.newsService.getNews(requestSymbol).subscribe(d => this.news = d);
      }
    }
  }

}
