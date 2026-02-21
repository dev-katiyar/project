import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MenuService } from '../../app.menu.service';
import { AppMainComponent } from '../../app.main.component';
import { HelpService } from 'src/app/help.service';

@Component({
  selector: '[app-menuitem]',
  templateUrl: 'menu-item.component.html',
  host: {
    '[class.layout-root-menuitem]': 'root',
    '[class.active-menuitem]': 'active',
  },
  animations: [
    trigger('children', [
      state('void', style({
        height: '0px',
      })),
      state('hiddenAnimated', style({
        height: '0px',
      })),
      state('visibleAnimated', style({
        height: '*',
      })),
      state('visible', style({
        height: '*',
        'z-index': 100,
      })),
      state('hidden', style({
        height: '0px',
        'z-index': '*',
      })),
      transition('visibleAnimated => hiddenAnimated', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)')),
      transition('hiddenAnimated => visibleAnimated', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)')),
      transition('void => visibleAnimated, visibleAnimated => void',
        animate('400ms cubic-bezier(0.86, 0, 0.07, 1)')),
    ]),
  ],
})
export class MenuItemComponent implements OnInit, OnDestroy {

  @Input() item: any;

  @Input() index: number;

  @Input() root: boolean;

  @Input() parentKey: string;

  active = false;

  menuSourceSubscription: Subscription;

  menuResetSubscription: Subscription;

  key: string;

  constructor(
    public appMain: AppMainComponent, 
    public router: Router, 
    private menuService: MenuService, 
    private helpService: HelpService
  ) {
    this.menuSourceSubscription = this.menuService.menuSource$.subscribe(key => {
      // deactivate current active menu
      if (this.active && this.key !== key && key.indexOf(this.key) !== 0) {
        this.active = false;
      }
    });

    this.menuResetSubscription = this.menuService.resetSource$.subscribe(() => {
      this.active = false;
    });

    this.router.events.pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(params => {
        if (this.appMain.isHorizontal() || this.appMain.isSlim()) {
          this.active = false;
        } else {
          if (this.item.routerLink) {
            this.updateActiveStateFromRoute();
          }
        }
      });
  }

  ngOnInit() {
    if (!(this.appMain.isHorizontal() || this.appMain.isSlim()) && this.item.routerLink) {
      this.updateActiveStateFromRoute();
    }

    this.key = this.parentKey ? this.parentKey + '-' + this.index : String(this.index);
  }

  updateActiveStateFromRoute() {
    this.active = this.router.isActive(this.item.routerLink[0], this.item.items ? false : true);
  }

  itemClick(event: Event) {
    // avoid processing disabled items
    if (this.item.disabled) {
      event.preventDefault();
      return true;
    }

    // if no items then hide the help icon (AK: excetional case of side menu single item. Need cleanup)
    if(this.item?.items?.length == 0) {
      this.helpService.subMenuItemClickEmit(undefined);
    }

    // navigate with hover in horizontal mode
    if (this.root) {
      this.appMain.menuHoverActive = !this.appMain.menuHoverActive;
    }

    // notify other items
    this.menuService.onMenuStateChange(this.key);

    // execute command
    if (this.item.command) {
      this.item.command({ originalEvent: event, item: this.item });
    }

    // toggle active state
    if (this.item.items) {
      this.active = !this.active;
    } else {
      // activate item
      this.active = true;

      // hide overlay menus
      if (this.appMain.isMobile()) {
        // this.appMain.sidebarActive = false;
        this.appMain.staticMenuMobileActive = false;
      }

      // reset horizontal menu
      if (this.appMain.isHorizontal() || this.appMain.isSlim()) {
        this.menuService.reset();
        this.appMain.menuHoverActive = false;
      }

      const ink = this.getInk(event.currentTarget);
      if (ink) {
        this.removeClass(ink, 'p-ink-active');
      }
    }
  }

  getInk(el) {
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < el.children.length; i++) {
      if (typeof el.children[i].className === 'string' && el.children[i].className.indexOf('p-ink') !== -1) {
        return el.children[i];
      }
    }
    return null;
  }

  removeClass(element, className) {
    if (element.classList) {
      element.classList.remove(className);
    } else {
      element.className = element.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  }

  onMouseEnter() {
    // activate item on hover
    if (this.root && this.appMain.menuHoverActive &&
      (this.appMain.isHorizontal() || this.appMain.isSlim()) && this.appMain.isDesktop()) {
      this.menuService.onMenuStateChange(this.key);
      this.active = true;
    }
  }

  ngOnDestroy() {
    if (this.menuSourceSubscription) {
      this.menuSourceSubscription.unsubscribe();
    }

    if (this.menuResetSubscription) {
      this.menuResetSubscription.unsubscribe();
    }
  }
}
