import { Component, OnInit } from '@angular/core';
import {LiveService} from '../services/live.service';
import {AppBreadcrumbService} from '../app.breadcrumb.service';
import { RIAConstants } from '../utils/ria.constants';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {

  successText ="";
  user ={"email":""};
  emailPattern = RIAConstants.EMAIL_PATTERN;

  constructor(
    private liveService:LiveService,
    private breadcrumbService: AppBreadcrumbService
    ) { 
      this.breadcrumbService.setItems([
        { label: 'Forgot Password', routerLink: ['forgot-password'] }
      ]);
    }

  ngOnInit() {
  }
  sendEmail(){
        this.liveService.postRequest("/forgotPassword",this.user).subscribe(d=>this.setStatus(d));

  }
  setStatus(d){
   if(d.status =="ok"){
            this.successText = "We have sent you the password in provided email address";
          }
          else{
           this.successText = d.status;
          }
  }
}
