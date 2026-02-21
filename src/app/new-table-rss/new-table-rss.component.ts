import { Component, Input, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';

@Component({
  selector: 'app-new-table-rss',
  templateUrl: './new-table-rss.component.html',
  styleUrls: ['./new-table-rss.component.scss']
})
export class NewTableRssComponent implements OnInit {
  @Input() newsClass = "news";
  newsData = [];

  constructor(private liveService: LiveService) { }

  ngOnInit(): void {
    this.liveService.getUrlData('/rss/news').subscribe(d => this.setRSSNewsData(d));
  }

  setRSSNewsData(d) {
    if(d) {
      for(let item of d) {
        item.published = new Date(item.published);
      }
      this.newsData = d;
    }
  }

}
