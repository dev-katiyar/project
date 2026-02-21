import { Component, OnInit } from '@angular/core';
import { UserTypeService } from '../services/user-type.service';
import { AuthenticationService } from '../_services';


@Component({
  selector: 'app-default-home-page',
  templateUrl: './default-home-page.component.html',
  styleUrls: ['./default-home-page.component.scss']
})
export class DefaultHomePageComponent implements OnInit {

  isUserLogged = false;
  userType = '';

  constructor(private userTypeService: UserTypeService, private authenticationService: AuthenticationService) {
    this.authenticationService.getLoggedInUser().subscribe(d => this.setUser(d));
  }

  ngOnInit(): void {
    this.userType = this.userTypeService.getUserType();
  }

  setUser(user) {
    if (user != null && user != "") {
      this.isUserLogged = true;
    }
    else {
      this.isUserLogged = false;
    }
  }

  isSVUser() {
    return ['sv_admin', 'sv_only_user', 'sv_tpa_user'].includes(this.userType);
  }

}
