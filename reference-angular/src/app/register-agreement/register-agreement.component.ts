import { Component, OnInit } from '@angular/core';
import { AppBreadcrumbService } from '../app.breadcrumb.service';

@Component({
  selector: 'app-register-agreement',
  templateUrl: './register-agreement.component.html',
  styleUrls: ['./register-agreement.component.css']
})
export class RegisterAgreementComponent implements OnInit {

  constructor( private breadcrumbService: AppBreadcrumbService) { 
    this.breadcrumbService.setItems([
      { label: 'Term and Conditions', routerLink: ['agreement'] }
    ]);
  }

  ngOnInit() {
  }

}
