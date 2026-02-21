import {Component} from '@angular/core';

@Component({
    selector: 'app-footer',
    template: `
      <div class="layout-footer">
        <div class="clearfix" style="font-size:0.85rem;text-align:center;">
          <span>
          &copy;{{ currentYear }} SimpleVisor, LLC. 11750 Katy Freeway, Suite 840, Houston, TX 77079. All Rights Reserved.
            <a routerLink="/agreement" target="_blank" id="showTerms">Term &amp; Conditions</a>
          </span>
        </div>
      </div>
    `
})
export class AppFooterComponent {
  currentYear = new Date().getFullYear();
}
