import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';
import { MenuService } from '../app.menu.service';

@Component({
  selector: 'app-menu',
  templateUrl: 'menu.components.html',
  styleUrls: ['menu.component.scss'],
})
export class MenuComponent implements OnInit {
  model: any[];
  currentSymbol = '';

  constructor(private notificationService: NotificationService, private router: Router, private menuService: MenuService) {}

  /** @inheritDoc */
  public ngOnInit(): void {
    this.notificationService.selectedSymbol.subscribe(symbol => {
      this.currentSymbol = symbol;
    });

    this.model = this.menuService.getMenuItems();
  }
}
