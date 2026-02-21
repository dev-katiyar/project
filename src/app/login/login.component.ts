import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../_services/index';
import { Router, ActivatedRoute } from '@angular/router';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { UserTypeService } from '../services/user-type.service';

/** Login component */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public serverError = '';
  private returnUrl: string;

  /** Form for user login data */
  public form = this.fb.group({
    email: [null, Validators.required],
    password: [null, Validators.required],
  });

  constructor(
    private readonly router: Router,
    private readonly fb: UntypedFormBuilder,
    private readonly route: ActivatedRoute,
    private readonly authenticationService: AuthenticationService,
    private readonly userTypeService: UserTypeService,
  ) {}

  /** Actions on init */
  public ngOnInit(): void {
    this.authenticationService.logout();

    this.returnUrl = this.route.snapshot.queryParams.returnUrl || '/';
  }

  /** Login user */
  public login(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authenticationService
      .login(this.form.controls.email.value, this.form.controls.password.value)
      .subscribe(
        data => {
          if (data.status === 'fail') {
            // this.router.navigate(['/upgrade', data.userId]);
          } else {
            if (this.userTypeService.getUserType() === 'tpa_only_user') {
              this.router.navigate(['/tpa-portfolios']);
            } else if (this.returnUrl === '/') {
              this.router.navigate(['/overview']);
            } else {
              this.router.navigate([this.returnUrl]);
            }
          }
        },
        err => {
          this.serverError = err.error.message;
        },
      );
  }
}
