import { Component } from '@angular/core';
import { AppComponent } from '../app.component';
import { AuthenticationService } from '../_services/index';

@Component({
  selector: 'topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css'],
})
export class TopBarComponent {
  userName = '';
  isUserLogged = false;

  constructor(public app: AppComponent, private authenticationService: AuthenticationService) {
    this.authenticationService.getLoggedInUser().subscribe(d => {
      this.setUser(d);
    });
  }

  public setUser(user): void {
    if (user !== null && user !== '') {
      this.isUserLogged = true;
      this.userName = user.username.split('@')[0];
    } else {
      this.userName = '';
      this.isUserLogged = false;
    }
  }
}
