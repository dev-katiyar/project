import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserTypeService } from '../services/user-type.service';
import { GtmService } from '../services/gtm.service';

@Injectable()
export class AuthenticationService {
  loggedInUser = new BehaviorSubject<any>(this.getUserFromLocalStorage());

  getLoggedInUser(): Observable<any> {
    return this.loggedInUser.asObservable();
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private userTypeService: UserTypeService,
    private readonly gtmService: GtmService,
  ) {}

  private getUserFromLocalStorage(): any {
    this.userTypeService.setUserType();
    const user = JSON.parse(localStorage.getItem('currentUser'));

    this.fireGtmEventForUserId(user);
    return user;
  }

  login(username: string, password: string) {
    this.gtmService.fireGtmEventForApiCalled('login');
    return this.http
      .post<any>(environment.baseUrl + '/login', { username: username, password: password })
      .pipe(
        map(result => {
          if (result && (result.status === 'success' || result.status === 'pass')) {
            // Store user with subscription status
            const userData = {
              ...result,
              hasActiveSubscription: result.status === 'success',
              subscriptionStatus: result.sub_status,
            };

            localStorage.setItem('currentUser', JSON.stringify(userData));

            this.fireGtmEventForUserId(userData);

            this.userTypeService.setUserType();
            this.loggedInUser.next(userData);
          }
          return result;
        }),
      );
  }

  logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.userTypeService.setUserType();
    this.loggedInUser.next('');
    this.router.navigate(['/login']);
  }

  fireGtmEventForUserId(user) {
    window['dataLayer'] = window['dataLayer'] || [];
    window['dataLayer'].push({
      userID: user?.userId,
      event: 'user_info',
    });
  }
}
