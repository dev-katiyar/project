import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { RIAConstants } from '../utils/ria.constants';
import { CommonUtils } from '../utils/common.utils';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent implements OnInit {
  @Input() cardInfo;

  cardInfoConstraints;

  constructor() {}

  ngOnInit(): void {
    this.setCardInfoConstraint();
    this.initUserCardInfo();
  }

  initUserCardInfo() {
    this.cardInfo.cardType = this.cardInfoConstraints.cardTypes[0].id;
    this.cardInfo.cardNumber = '';
    this.cardInfo.expMonth = this.cardInfoConstraints.expMonthOptions[5].id;
    this.cardInfo.expYear = this.cardInfoConstraints.expYearOptions[2].id;
    this.cardInfo.cvc = '';
  }

  setCardInfoConstraint() {
    let d = new Date();
    let currentyear = d.getFullYear();

    this.cardInfoConstraints = {
      cardTypes: CommonUtils.getCreditCards().map(x => ({ name: x, id: x })),
      cardNumberLength: 16,
      cardNumberMask: '9999-9999-9999-9999',
      cardCvvMask: '999',
      expMonthOptions: CommonUtils.createDropDownItems(1, 12),
      expYearOptions: CommonUtils.createDropDownItems(currentyear, currentyear + 15),
      cvcLength: 3,
    };
  }

  cardTypeChanged(cardType) {
    if (cardType == 'Amex') {
      this.cardInfoConstraints.cardNumberMask = '9999-999999-99999';
      this.cardInfoConstraints.cardCvvMask = '9999';
      this.cardInfoConstraints.cardNumberLength = 15;
      this.cardInfoConstraints.cvcLength = 4;
    } else if (cardType == 'Diners') {
      this.cardInfoConstraints.cardNumberMask = '9999-999999-9999';
      this.cardInfoConstraints.cardCvvMask = '999';
      this.cardInfoConstraints.cardNumberLength = 14;
      this.cardInfoConstraints.cvcLength = 3;
    } else {
      this.cardInfoConstraints.cardNumberMask = '9999-9999-9999-9999';
      this.cardInfoConstraints.cardCvvMask = '999';
      this.cardInfoConstraints.cardNumberLength = 16;
      this.cardInfoConstraints.cvcLength = 3;
    }
  }

  isCardDetailValid() {
    // card number
    const cardNumberMinMaxLength = this.cardInfoConstraints.cardNumberLength;
    const cardNumberLength = this.cardInfo.cardNumber
      ?.replaceAll('-', '')
      .replaceAll('_', '').length;
    const isCardNumberValid = cardNumberLength == cardNumberMinMaxLength;

    // cvc
    const cvcMinMaxLength = this.cardInfoConstraints.cvcLength;
    const cvcLength = this.cardInfo.cvc?.replaceAll('_', '').length;
    const isCVCValid = cvcLength == cvcMinMaxLength;

    return isCardNumberValid && isCVCValid;
  }

  resetCardInfo() {
    this.cardInfo = {
      cardNumber: '',
      expMonth: this.cardInfoConstraints.expMonthOptions[5].id,
      expYear: this.cardInfoConstraints.expYearOptions[2].id,
      cvc: '',
    };
  }
}
