import { Component } from '@angular/core';
import { MenuService } from './app.menu.service';
import { PrimeNGConfig } from 'primeng/api';
import { AppComponent } from './app.component';
import { AppBreadcrumbService } from './app.breadcrumb.service';
import { SymbolPopupService } from './symbol-popup.service';
import { HelpService } from './help.service';

@Component({
    selector: 'app-main',
    templateUrl: './app.main.component.html',
    styleUrls: ['./app.main.component.scss'],
})
export class AppMainComponent {

    topbarUserMenuActive: boolean;

    overlayMenuActive: boolean;

    staticMenuDesktopInactive: boolean;

    staticMenuMobileActive: boolean;

    menuClick: boolean;

    topbarItemClick: boolean;

    activeTopbarItem: any;

    menuHoverActive: boolean;

    configClick: boolean;

    configActive: boolean;

    isSymbolPopupVisible: boolean = false;
    selectedSymbol: string = 'AAPL';

    helpKey = '';
    hasHelpMsg = false;

    constructor(
        private menuService: MenuService,
        private primengConfig: PrimeNGConfig,
        private breadcrumbService: AppBreadcrumbService,
        private symbolPopupService: SymbolPopupService,
        public app: AppComponent,
        private helpService: HelpService, 
    ) {
        this.breadcrumbService.setItems([
            {label: 'Home', routerLink: ['/']}
        ]);

        this.symbolPopupService.popupToggleObservable$.subscribe(symbol => {
            if(symbol) {
                this.showSymbolPopup(symbol);
            }
        })

        this.helpService.subMenuClickObs$.subscribe(item => {
            this.onSubMenuItemClick(item);
        })
    }

    showSymbolPopup(symbol) {
        this.selectedSymbol = symbol;
        this.isSymbolPopupVisible = true;
    }

    // do we need this?
    hideSymbolPopup() {
        this.isSymbolPopupVisible = false;
    }

    onSubMenuItemClick(item) {
        this.hasHelpMsg = false;
        if(item) {
            this.helpKey = item.helpKey;
            this.hasHelpMsg = this.helpService.hasHelpKey(this.helpKey);
        }
    }

    onLayoutClick() {
        if (!this.topbarItemClick) {
            this.activeTopbarItem = null;
            this.topbarUserMenuActive = false;
        }

        if (!this.menuClick) {
            if (this.isHorizontal() || this.isSlim()) {
                this.menuService.reset();
            }

            if (this.overlayMenuActive || this.staticMenuMobileActive) {
                this.hideOverlayMenu();
            }

            this.menuHoverActive = false;
        }

        if (this.configActive && !this.configClick) {
            this.configActive = false;
        }

        this.configClick = false;
        this.topbarItemClick = false;
        this.menuClick = false;
    }

    onMenuButtonClick(event) {
        this.menuClick = true;
        this.topbarUserMenuActive = false;

        if (this.isOverlay()) {
            this.overlayMenuActive = !this.overlayMenuActive;
        }
        if (this.isDesktop()) {
            this.staticMenuDesktopInactive = !this.staticMenuDesktopInactive;
        } else {
            this.staticMenuMobileActive = !this.staticMenuMobileActive;
        }

        event.preventDefault();
    }

    onMenuClick() {
        this.menuClick = true;
    }

    onTopbarMenuButtonClick(event) {
        this.topbarItemClick = true;
        this.topbarUserMenuActive = !this.topbarUserMenuActive;

        this.hideOverlayMenu();

        event.preventDefault();
    }

    onTopbarItemClick(event, item) {
        this.topbarItemClick = true;

        if (this.activeTopbarItem === item) {
            this.activeTopbarItem = null;
        } else {
            this.activeTopbarItem = item;
        }

        event.preventDefault();
    }

    onTopbarSubItemClick(event) {
        event.preventDefault();
    }

    onConfigClick(event) {
        this.configClick = true;
    }

    onRippleChange(event) {
        this.app.ripple = event.checked;
        this.primengConfig = event.checked;
    }

    isHorizontal() {
        return this.app.menuMode === 'horizontal';
    }

    isSlim() {
        return this.app.menuMode === 'slim';
    }

    isOverlay() {
        return this.app.menuMode === 'overlay';
    }

    isStatic() {
        return this.app.menuMode === 'static';
    }

    isMobile() {
        return window.innerWidth < 1024;
    }

    isDesktop() {
        return window.innerWidth >= 1024;
    }

    isTablet() {
        const width = window.innerWidth;
        return width <= 1024 && width > 640;
    }

    hideOverlayMenu() {
        this.overlayMenuActive = false;
        this.staticMenuMobileActive = false;
    }
}
