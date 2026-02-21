import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-contact-us-combined',
  templateUrl: './contact-us-combined.component.html',
  styleUrls: ['./contact-us-combined.component.scss'],
})
export class ContactUsCombinedComponent implements OnInit {
  @Output() public msgSent = new EventEmitter();

  constructor() {}

  ngOnInit(): void {}

  messageSent(event) {
    if (event.value == 'success') {
      this.msgSent.emit(event);
    }
  }
}
