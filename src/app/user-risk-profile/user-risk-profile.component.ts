import { Component, Input, OnInit } from '@angular/core';
import { CommonUtils } from '../utils/common.utils';

@Component({
  selector: 'app-user-risk-profile',
  templateUrl: './user-risk-profile.component.html',
  styleUrls: ['./user-risk-profile.component.scss'],
})
export class UserRiskProfileComponent implements OnInit {
  // data comes from parent component
  @Input('userData') userData;

  ageOptions: any[] = CommonUtils.createDropDownItems(20, 100);
  dependentsOptions: any[] = CommonUtils.createDropDownItems(0, 5);
  maritalStatusOptions: any[] = CommonUtils.getMarriedStatus();
  riskToleranceOptions: any[] = CommonUtils.getRiskToleranceOptions();
  financialGoalOptions: any[] = CommonUtils.getFinancialGoalOptions();

  constructor() {}

  ngOnInit(): void {}
}
