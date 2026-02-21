import { Component, EventEmitter, NgZone, OnInit, Output, ViewChild } from '@angular/core';
import { LiveService } from '../services/live.service';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
})
export class PaymentComponent implements OnInit {
  @Output() public cardSaved = new EventEmitter();

  // moving card info capture and validation in separate component
  user: any = {
    cardInfo: {
      cardType: '',
      cardNumber: '',
      expMonth: '',
      expYear: '',
      cvc: '',
    },
  };
  @ViewChild(CardComponent) cardComp: CardComponent;

  // agreement
  agreementSigned = false;

  // house keeping
  loading = false;
  stripeMessage = '';

  constructor(private liveService: LiveService, private ngZone: NgZone) {}

  ngOnInit() {}


  meetsUserConstraints() {
    return this.cardComp && this.cardComp.isCardDetailValid();
  }

  updateCreditCard() {
    this.loading = true;
    this.getToken();
  }

  getToken() {
    this.stripeMessage = 'Securing Card Details with payment provider...';
    // any call backs run by windows object run out side the angular zone. We need to ensure that variables in angular code are updated in angular zone, so that UI also updated when variables are changed
    (<any>window).Stripe.createToken(
      {
        number: this.user.cardInfo.cardNumber,
        exp_month: this.user.cardInfo.expMonth,
        exp_year: this.user.cardInfo.expYear,
        cvc: this.user.cardInfo.cvc,
      },
      (status: number, response: any) => {
        this.ngZone.run(() => this.updateCardDetails(status, response));
      },
    );
  }

  updateCardDetails(status: number, response: any) {
    if (status === 200) {
      // set message
      this.stripeMessage = 'Card details encryption done. Updating Card...';

      // remove card info from page (user object)
      this.cardComp.resetCardInfo();
      this.user = { ...this.user, card_id: response.id };

      // update card info
      this.liveService
        .postRequest('/user/update_creditcard', this.user)
        .subscribe(d => this.setStatus(d));
    } else {
      this.stripeMessage = response.error.message;
      this.loading = false;
    }
  }

  setStatus(d) {
    this.loading = false;
    this.stripeMessage = d.message;
    this.cardSaved.emit();
    this.stripeMessage = '';
  }
}
