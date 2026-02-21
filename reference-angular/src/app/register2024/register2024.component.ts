import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RIAConstants } from '../utils/ria.constants';
import { LiveService } from '../services/live.service';
import { CommonUtils } from '../utils/common.utils';
import { environment } from 'src/environments/environment';
import { RecaptchaComponent } from 'ng-recaptcha-2';
import { Router } from '@angular/router';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-register2024',
  templateUrl: './register2024.component.html',
  styleUrls: ['./register2024.component.scss'],
})
export class Register2024Component implements OnInit {
  // Page Cotent Controls
  regSteps: MenuItem[] = [
    { label: 'Basic Info' },
    { label: 'Risk Profile' },
    { label: 'Subscription' },
  ];
  activeIndex = 0;

  // capture user data
  user: any;
  userConstraints: any;
  agreementSigned = false;

  // user check in system related
  abortReg = false;
  resStatusUserCheck = null;
  customerInfo = null;
  customerStatus = null;

  // Capthca Related
  siteKey = environment.SITE_KEY;
  isCaptchaVerified = false;
  @ViewChild('captcha') captchaEl: RecaptchaComponent;

  // Error Message
  errMsg = '';

  // User Message
  userMsg = '';
  promoCodeValid = false;

  // user registration related
  isRegisterEnabeld = true;
  regResReceived = false;
  resStatusUserReg = null;

  // utilites
  loading = false;

  // plan details with coupon
  couponPlanDetails = null;

  // moving card info capture and validation in separate component
  @ViewChild(CardComponent) cardComp: CardComponent;

  constructor(private liveService: LiveService, private router: Router, private _zone: NgZone) {}

  ngOnInit(): void {
    this.setUserObjConstraint();
    this.setUserObj();
  }

  setUserObj() {
    this.user = {
      basicInfo: {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
      },
      riskProfile: {
        age: '',
        dependents: '',
        maritalStatus: '',
        financialGoal: '',
        riskTolerance: '',
      },
      subscription: {
        subType: 1,
        promoCode: '',
      },
      cardInfo: {
        // default value is set inside card component
        cardType: '',
        cardNumber: '',
        expMonth: '',
        expYear: '',
        cvc: '',
      },
    };
  }

  setUserObjConstraint() {
    let d = new Date();
    let currentyear = d.getFullYear();

    this.userConstraints = {
      basicInfo: {
        firstNameMinLength: 1,
        emailPattern: RIAConstants.EMAIL_PATTERN,
        passwordMinLength: 1,
      },
      riskProfile: {
        ageOptions: CommonUtils.createDropDownItems(20, 100),
        dependentOptions: CommonUtils.createDropDownItems(0, 5),
        maritalStatusOptions: CommonUtils.getMarriedStatus(),
        riskToleranceOptions: CommonUtils.getRiskToleranceOptions(),
        financialGoalOptions: CommonUtils.getFinancialGoalOptions(),
      },
      subscription: {
        subTypeOptions: null,
        promoCodeMinLength: 2,
      },
    };
  }

  // facilitates the navigation using buttons
  onActiveIndexChange(selIndex) {
    this.activeIndex = selIndex;
  }

  // facilitates the back button navigation
  onBackClick() {
    if (this.activeIndex > 0) {
      this.activeIndex -= 1;
    }
  }

  onNextClick() {
    // Step 1: Log and Check User for duplicate registrations
    if (this.activeIndex == 0) {
      this.validateAndSaveUserInteration(this.user.basicInfo);
    }

    // Step 2: No Checks. Get Subscription Options
    if (this.activeIndex == 1) {
      this.getSubscriptionTypes();
    }

    // Move to Next Step and UI
    if (this.activeIndex < this.regSteps.length - 1) {
      this.activeIndex += 1;
    }
  }

  validateAndSaveUserInteration(basicInfo) {
    this.loading = true;
    this.liveService.postRequest('/register/usercheck', basicInfo).subscribe(
      res => {
        this.handleUserCheck(res);
      },
      err => {
        this.loading = false;
      },
    );
  }

  handleUserCheck(res) {
    this.loading = false;
    this.resStatusUserCheck = res['status'];
    if (this.resStatusUserCheck != 'new') {
      // show action based on status message
      this.abortReg = true;
      this.resetData();
      this.setCustomerDataAndActionScreen(res);
    } else {
      // new user process continues to next step and leading to new registration
      this.abortReg = false;
    }
  }

  resetData() {
    this.agreementSigned = false;
    this.user = null;
    this.isCaptchaVerified = false;
    this.clearMessages();
  }

  setCustomerDataAndActionScreen(res) {
    // other case 'internal' and 'error' are taken care direclty in UI
    if (this.resStatusUserCheck == 'returning') {
      this.customerInfo = res['res'];
    }
  }

  getSubscriptionTypes() {
    this.loading = true;
    this.liveService.getSubscriptions('all').subscribe(
      res => {
        this.loading = false;
        this.userConstraints.subscription.subTypeOptions = res;
      },
      err => {
        this.loading = false;
      },
    );
  }

  // turns off next button, if data is not ready
  meetsUserConstraints() {
    // Basic Info Check
    if (this.activeIndex == 0) {
      return this.meetsBasicInfoConstraints();
    }

    // Risk Profile Info Check (All fields are optional)
    if (this.activeIndex == 1) {
      return true;
    }

    // Subscription Info (Subscription, Card, Agreement, Captcha) Check
    if (this.activeIndex == 2) {
      return this.meetsSubscirptionConstraints();
    }
  }

  meetsBasicInfoConstraints() {
    // first name
    const firstNameLength = this.user.basicInfo.firstName.length;
    const firstNameMinLength = this.userConstraints.basicInfo.firstNameMinLength;
    const isFirstNameValid = firstNameLength >= firstNameMinLength;

    // email
    const regex = new RegExp(this.userConstraints.basicInfo.emailPattern);
    const isEmailValid = regex.test(this.user.basicInfo.email);

    // password
    const passwordLength = this.user.basicInfo.password.length;
    const passwordMinLength = this.userConstraints.basicInfo.passwordMinLength;
    const isPasswordValid = passwordLength >= passwordMinLength;

    return isFirstNameValid && isEmailValid && isPasswordValid;
  }

  meetsSubscirptionConstraints() {
    // promo code
    const pCodeMinLength = this.userConstraints.subscription.promoCodeMinLength;
    const pCodeLength = this.user.subscription.promoCode.length;
    const isPromoCodeValid = pCodeLength == 0 || pCodeLength >= pCodeMinLength;

    return isPromoCodeValid && this.cardComp && this.cardComp.isCardDetailValid();
  }

  showResponse(data) {
    const post_data = { token: data };
    this.liveService
      .postRequest('/user/validate-captcha', post_data)
      .subscribe(d => this.setCaptchaVerification(d));
  }

  setCaptchaVerification(captchaResponse) {
    if (captchaResponse.success) {
      this.isCaptchaVerified = true;
      this.clearMessages();
    } else {
      this.errMsg = 'Verification Issue! Try again or contact SimpleVisor team.';
      this.resetCaptcha();
    }
  }

  resetCaptcha() {
    this.isCaptchaVerified = false;
    this.captchaEl.reset();
  }

  onRegisterClick() {
    this.validateCreditCard();
  }

  validateCreditCard() {
    this.loading = true;

    this.isRegisterEnabeld = false;
    this.errMsg = 'Securing Card Details with payment provider...';
    (<any>window).Stripe.createToken(
      {
        number: this.user.cardInfo.cardNumber,
        exp_month: this.user.cardInfo.expMonth,
        exp_year: this.user.cardInfo.expYear,
        cvc: this.user.cardInfo.cvc,
      },
      (status: number, response: any) => {
        this._zone.run(() => {
          if (status === 200) {
          // set message
          this.errMsg = 'Card details encryption done. Registering with SimpleVisor...';

          // remove card info from page (user object)
          this.user.cardInfo = { card_id: response.id };

          // register user - attempt
          this.liveService
            .postRequest('/register2024', this.user)
            .subscribe(res => this.setStatus(res), err => this.setError(err));
        } else {
          this.errMsg = response.error.message;
          this.loading = false;
          this.isRegisterEnabeld = false;
        }
        })
      },
    );
  }

  setStatus(res) {
    this.loading = false;

    this.errMsg = 'Registration Sucessfull';

    this.resStatusUserReg = res["status"];

    // if user already exists 
    if(this.resStatusUserReg == "check_failed") {
      this.handleUserCheck(res["res"]);
    }

    // all other cases - actual registration
    this.regResReceived = true;
    // error_database, error_email, error_stripe, error_server, registered(success) - cases handled in UI directly

    this.errMsg = res['res'];
    
    (<any>window).scrollTo({ top: 0, behavior: 'smooth' });
  }

  setError(err) {
    // this is when unkown/uncaught error from the server whle registering
    this.errMsg = err;
    this.loading = false;
    this.isRegisterEnabeld = false;
    this.resStatusUserReg = "error_server";
    (<any>window).scrollTo({ top: 0, behavior: 'smooth' });
}

  resetComponent() {
    this.activeIndex = 0;
    this.agreementSigned = false;
    this.abortReg = false;
    this.resStatusUserCheck = null;
    this.customerInfo = null;
    this.customerStatus = null;
    this.isCaptchaVerified = false;
    this.clearMessages();
    this.isRegisterEnabeld = true;
    this.regResReceived = false;
    this.resStatusUserReg = null;
    this.loading = false;
    this.cardComp.resetCardInfo();
    this.couponPlanDetails = null;
    (<any>window).scrollTo({ top: 0, behavior: 'smooth' });
  }

  onApplyPromoCode() {
    this.clearMessages();
    this.liveService.postRequest('/register/validate-promo-code', { coupon_code: this.user.subscription.promoCode, plan: this.user.subscription.subType }).subscribe(
      res => {
        if (res['status'] == 'valid') {
          this.userMsg = 'Promo Code is Valid! It will be applied during registration, do not remove it from the box above.';
          this.promoCodeValid = true;
          this.couponPlanDetails = res['res'];
        } else { 
          this.promoCodeValid = false;
          this.userMsg = res['res'];
        }
  });
}

  clearMessages() {
    this.errMsg = '';
    this.userMsg = '';
    this.promoCodeValid = false;
    this.couponPlanDetails = null;
  }
}
