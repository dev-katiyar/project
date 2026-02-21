import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserTypeService } from '../services/user-type.service';
import { AuthenticationService } from '../_services/index';

// Pages accessible to users with expired subscriptions
const SUBSCRIPTION_EXPIRED_ALLOWED_PAGES = ['/profile'];

@Injectable()
export class AuthGuard {
  constructor(
    private router: Router,
    private userTypeService: UserTypeService,
    private authenticationService: AuthenticationService,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userType = this.userTypeService.getUserType();

    if (!currentUser || !userType) {
      this.authenticationService.logout();
      return false;
    }

    // Check if user has active subscription
    const hasActiveSubscription = currentUser.hasActiveSubscription !== false;

    if (hasActiveSubscription) {
      return true;
    }

    // If subscription is expired/inactive, only allow specific pages
    if (!hasActiveSubscription) {
      if (SUBSCRIPTION_EXPIRED_ALLOWED_PAGES.some(page => state.url.startsWith(page))) {
        return true;
      }
      // Redirect to profile/subscription page
      this.router.navigate(['/profile']);
      return false;
    }

    // not logged in so redirect to login page with the return url
    this.authenticationService.logout();
    return false;
  }
}
