import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonUtils } from '../utils/common.utils';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  // data comes from parent component
  @Input('userData') userData;

  constructor() { }

  ngOnInit(): void {
  }

}
