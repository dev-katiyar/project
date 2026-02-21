import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

@Component({
    selector: 'app-charts',
    templateUrl: './charts.component.html',
    styleUrls: ['./charts.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class ChartsComponent implements OnInit {

    symbolDetail: any;
    symbol = "AAPL";
    @Input() isModalView = false;

    constructor(
        private router: Router,
        private notificationService: NotificationService) {
    }

    ngOnInit() {
        this.notificationService.selectedSymbol.subscribe((symbol) => {
            this.symbol = symbol;
        });
    }

    symbolSelected(event) {
        this.router.navigate(['/charts']);
    }
}
