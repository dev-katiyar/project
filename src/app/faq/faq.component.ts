import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../app.breadcrumb.service';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css']
})
export class FaqComponent implements OnInit {

  constructor(private breadcrumbService: AppBreadcrumbService) {
      this.breadcrumbService.setItems([
          {label: 'FAQs', routerLink: ['/faq']}
      ]);
  }

  ngOnInit() {
  }

}
