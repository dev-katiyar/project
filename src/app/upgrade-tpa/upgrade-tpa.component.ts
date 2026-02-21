import { Component, Output, OnInit, NgZone, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';
import { CommonUtils } from '../utils/common.utils';
import { UserTypeService } from '../services/user-type.service';

@Component({
  selector: 'app-upgrade-tpa',
  templateUrl: './upgrade-tpa.component.html',
  styleUrls: ['./upgrade-tpa.component.css'],
})
export class UpgradeTpaComponent implements OnInit {
  displayDialog;
  expYears = CommonUtils.createStepArray(2021, 2030);
  expMonths = CommonUtils.createStepArray(1, 12);
  loading = false;
  stripeMessage = '';
  user = {
    card_id: '',
    firstName: '',
    email: '',
    lastName: '',
    cardNumber: '',
    expMonth: '10',
    expYear: '2019',
    promoCode: '',
    nameOnCard: '',
    cardType: 'Visa',
    password: '',
    subscription: { id: 4 },
    cvc: '',
    userId: 0,
  };

  subscriptionType: any;
  submitted = false;
  agreementSigned = false;
  newViewTypeId: any;
  redirectFrom = 'tpa';

  @Output() public onSubscriptionChange = new EventEmitter();

  constructor(
    private messageService: MessageService,
    private liveService: LiveService,
    private _zone: NgZone,
    private route: ActivatedRoute,
    private router: Router,
    private userTypeService: UserTypeService
  ) {}

  ngOnInit() {
    let d = new Date();
    let currentyear = d.getFullYear();
    this.expYears = CommonUtils.createStepArray(currentyear, currentyear + 15);
    this.user.expYear = (currentyear + 2).toString();
    this.route.params.subscribe(params => {
      this.redirectFrom = params['redirectFrom'];
      if (this.redirectFrom === 'tpa') {  // if user is tpa only
        this.liveService.getSubscriptions('all').subscribe(res => this.setSubscriptionType(res));
      } 
      if(this.redirectFrom === 'sv') {    // if user is sv only
        this.liveService.getSubscriptions('tpa').subscribe(res => this.setSubscriptionType(res));
      }
    });
    
  }

  setSubscriptionType(res) {
    this.subscriptionType = res;
  }

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1000 });
    this.loading = false;
  }

  onSubmit() {
    this.submitted = true;
  }

  saveChangedSubscription() {
    this.loading = true;
    this.liveService
      .postRequest('/user/subscription', {
        action: 'changeSubscription',
        subscriptionId: this.user.subscription.id,
      })
      .subscribe(res => this.setChangeSubscription(res));
  }

  setChangeSubscription(res) {
    this.loading = false;
    this.showStatus({ status: 'success', message: res.message });
    this.onSubscriptionChange.emit({
      value: 'None',
    });
  }

  register() {
    this.getToken();
  }

  getToken() {
    this.stripeMessage = 'Validating Create Card Please Wait...';
    (<any>window).Stripe.card.createToken(
      {
        number: this.user.cardNumber,
        exp_month: this.user.expMonth,
        exp_year: this.user.expYear,
        cvc: this.user.cvc,
      },
      (status: number, response: any) => {
        this._zone.run(() => {
          if (status === 200) {
            this.user.card_id = response.id;
            this.stripeMessage = 'Credit Card Validated . Please Wait !';
            this.liveService.postRequest('/upgrade', this.user).subscribe(d => this.setStatus(d));
          } else {
            this.stripeMessage = response.error.message;
            this.loading = false;
          }
        });
      },
    );
  }
  setStatus(d) {
    this.loading = false;
    if (d.status == 'ok') {
      this.router.navigate(['/register-success']);
    } else {
      this.stripeMessage = d.message;
    }
  }

  showPlanDetails() {
    this.displayDialog = true;
  }
}
