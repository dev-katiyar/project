import { Component, OnInit } from '@angular/core';
import {LiveService} from '../services/live.service';
import {AppBreadcrumbService} from '../app.breadcrumb.service';

@Component({
  selector: 'app-news-rss',
  templateUrl: './news-rss.component.html',
  styleUrls: ['./news-rss.component.css']
})
export class NewsRssComponent implements OnInit {

  newsData=[];

    constructor( private liveService: LiveService,
                private breadcrumbService: AppBreadcrumbService) {
      this.breadcrumbService.setItems([
            {label: 'Research'},
            {label: 'News', routerLink: ['/news']}
      ]);
    }

    ngOnInit() {
           this.liveService.getDetailNews().subscribe(d =>  this.setNews(d));

    }

    setNews(response){
       for (const [key, value] of Object.entries(response)) {
           this.newsData.push({"source":key,"value":value});
       }
    }
}
