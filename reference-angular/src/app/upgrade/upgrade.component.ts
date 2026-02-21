import { Component, OnInit,NgZone } from '@angular/core';
import {LiveService} from '../services/live.service';
import { Router,ActivatedRoute } from '@angular/router';
import {CommonUtils} from '../utils/common.utils';
import { RIAConstants } from '../utils/ria.constants';

@Component({
  selector: 'app-upgrade',
    templateUrl: './upgrade.component.html',
    styleUrls: ['./upgrade.component.scss']
})
export class UpgradeComponent implements OnInit  {

  displayDialog = false;
    displayPromo = false;
    stripeMessage = '';
    user = {
      'card_id': '',
      'firstName': '',
      'email': '',
      'lastName': '',
      'cardNumber': '',
      'expMonth': "10",
      'expYear': "2022",
      'promoCode': '',
      'nameOnCard': '',
      'cardType': 'Visa',
      'password': '',
      'subscription': '1',
      'cvc': '',
      'age': "20",
      'maritalStatus': "1",
      'dependents': '',
      'streetAddress': '',
      'streetAddress2': '',
      'state': '',
      'zip': '',
      'city': '',
      'risk_tolerance': 1,
      'financial_goals':2,
      'userId':0
    };
    emailPattern = RIAConstants.EMAIL_PATTERN;
    streetAddress: any = '';
    streetAddress2: any = '';
    zip: any = '';
    city: any = '';
    creditCards: any[] = CommonUtils.getCreditCards().map(x=>({"name":x,"code":x}));
    states: any;
    expMonths: any[] = CommonUtils.createDropDownItems(1,12);
    expYears = CommonUtils.createDropDownItems(2021,2040);
    subscriptionType: any;
    submitted = false;
    agreementSigned = false;
    subscription: any;
    maritalStatus: any[] = CommonUtils.getMarriedStatus();
    dependents: any[] = CommonUtils.createDropDownItems(1,5);
    age: any[] = CommonUtils.createDropDownItems(20,100);
    selectedState: any = null;
    selectedMonth: any = null;
    selectedYear: any = null;
    registerQuestions: any;

    constructor(private liveService:LiveService,private _zone: NgZone,private router: Router,
     private route: ActivatedRoute

    ) {
    }

    ngOnInit() {
      this.liveService.getAllStates().subscribe(res => this.states = res);
      this.liveService.getSubscriptions('all').subscribe(res => this.subscriptionType = res);
      let d = new Date();
      let currentyear = d.getFullYear();
      this.route.params.subscribe(params => this.user.userId = params["userId"]);
      this.expYears=CommonUtils.createDropDownItems(currentyear,currentyear+15);
      this.user.expYear = (currentyear+2).toString();
    }


    onSubmit() {
      this.submitted = true;
    }

    register() {
     this.getToken();
    }


    getToken() {
      this.stripeMessage = 'Validating Create Card Please Wait...';
      (<any> window).Stripe.card.createToken({
        number: this.user.cardNumber,
        exp_month: this.user.expMonth,
        exp_year: this.user.expYear,
        cvc: this.user.cvc,
      }, (status: number, response: any) => {

        this._zone.run(() => {
          if (status === 200) {
            this.user.card_id = response.id;
            this.stripeMessage = 'Credit Card Validated . Please Wait !';
            this.liveService.postRequest("/upgrade",this.user).subscribe(d=> this.setStatus(d));
          } else {
            this.stripeMessage = response.error.message;
          }
        });
      });
    }

    setStatus(d) {

      if (d.status == 'ok') {

        this.router.navigate(['/']);
      } else {

        this.stripeMessage = d.message;
      }
    }

    showPlanDetails() {
      this.displayDialog = true;
    }

    showPromoCode() {
      this.displayPromo = true;
    }
}