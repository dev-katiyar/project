import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../app.breadcrumb.service';

@Component({
  selector: 'app-test-placeholder',
  templateUrl: './test-placeholder.component.html',
  styleUrls: ['./test-placeholder.component.css']
})
export class TestPlaceholderComponent implements OnInit {

  constructor(private breadcrumbService: AppBreadcrumbService) {
        this.breadcrumbService.setItems([
              {label: ''}
        ]);
  }

  ngOnInit(): void {
  }

}
