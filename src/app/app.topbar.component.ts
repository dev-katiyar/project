import { Component, OnInit } from '@angular/core';
import { AppMainComponent } from './app.main.component';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { AuthenticationService } from './_services/index';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from './services/notification.service';
import { MenuService } from './app.menu.service';
import { filter } from 'rxjs/operators';
import { LoaderService } from './services/loader.service';
import { HelpService } from './help.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-topbar',
  templateUrl: './app.topbar.component.html',
  styleUrls: ['./app.topbar.component.scss'],
})
export class AppTopBarComponent implements OnInit {
  /** Icon for alert bell. */
  public readonly faBell = faBell;

  userName = ''; // user name thing can be moved to app.main and passed to topbar. or make it part of the service.
  isUserLogged = false;
  firstName = '';
  lastName = '';
  alertsCount = 0;
  symbol = '';
  menuItems = [];
  selectedMainItem = {};
  selectedSubMenuItem: any = {};

  displayWelcome2024 = false;
  showIntroVideo = false;

  constructor(
    public appMain: AppMainComponent,
    private router: Router,
    private authenticationService: AuthenticationService,
    private notificationService: NotificationService,
    private menuService: MenuService,
    private loaderService: LoaderService,
    private helpService: HelpService,
    private messageService: MessageService,
  ) {
    authenticationService.getLoggedInUser().subscribe(d => this.setUser(d));
  }

  activeMainMenuTabIndex = 0;

  ngOnInit(): void {
    this.menuItems = this.menuService.getMenuItems();
    this.selectedMainItem = this.menuItems[0].items[0];

    this.notificationService.selectedSymbol.subscribe(symbol => {
      this.symbol = symbol;
    });

    this.loaderService.currentURLObs$.subscribe(url => {
      if (url) {
        this.setActiveMainAndSubMenuItem(url);
      }
    });
  }

  setActiveMainAndSubMenuItem(url) {
    const mainMenu = this.menuItems[0].items;
    for (let idx = 0; idx < mainMenu.length; idx++) {
      const subMenu = mainMenu[idx];
      const foundItem = subMenu.items.find(item => {
        let itemURL = '';
        if ('routerLink' in item) {
          itemURL = item.routerLink[0];
        }
        if ('url' in item) {
          itemURL = item?.url[0];
        }

        return url.includes(itemURL);
      });
      if (foundItem) {
        this.mainMenuItemClicked({ index: idx });
        this.onSubMenuItemClick(foundItem);
        break;
      }
    }
  }

  setUser(user) {
    if (user != null && user != '') {
      this.isUserLogged = true;
      this.userName = user.username.split('@')[0];
      this.firstName = user.firstName[0].toUpperCase();
      this.lastName = user.lastName[0].toUpperCase() + user.lastName.slice(1);
    } else {
      this.userName = '';
      this.firstName = '';
      this.lastName = '';
      this.isUserLogged = false;
    }
  }

  onSymbolSelected(event) {
    this.symbol = event.value;
    this.router.navigate(['/overview-stock']);
  }

  logOut($event) {
    this.appMain.onTopbarSubItemClick($event);
    this.authenticationService.logout();
  }

  alertsLoaded(count) {
    this.alertsCount = count;
  }

  mainMenuItemClicked(event) {
    this.selectedMainItem = this.menuItems[0].items[event.index];
    this.activeMainMenuTabIndex = event.index;
    if (this.selectedMainItem['items']?.length === 0) {
      this.helpService.subMenuItemClickEmit(undefined);
    }
  }

  onSubMenuItemClick(item) {
    this.selectedSubMenuItem = item;
    this.helpService.subMenuItemClickEmit(item);
  }

  copyToClipboard() {
    this.messageService.add({
      severity: 'success',
      summary: 'Copy Success',
      detail: 'Email Address Copied to Clipboard',
      life: 1000,
    });
    navigator.clipboard.writeText('contact@simplevisor.com');
  }

  showHelpIcon() {
    this.showIntroVideo = true;
  }
}
