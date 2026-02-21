import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-notification-pref-switch',
  templateUrl: './notification-pref-switch.component.html',
  styleUrls: ['./notification-pref-switch.component.scss'],
})
export class NotificationPrefSwitchComponent implements OnInit {
  @Input() label;

  // 2 way binding
  @Input() set value(val: any) {
    this._value = Boolean(val);
  }
  get value(): any {
    return this._value;
  }
  private _value: boolean;

  @Output() valueChange: EventEmitter<any> = new EventEmitter<any>();

  constructor() {}

  ngOnInit(): void {
    // console.log(this.value);
  }

  onChangeClick(event) {
    this._value = event.checked;
    // emit change event to parent component (convert back to number if needed)
    this.valueChange.emit(Number(this._value));
  }
}
