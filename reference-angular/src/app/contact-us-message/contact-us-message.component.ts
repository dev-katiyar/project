import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-contact-us-message',
  templateUrl: './contact-us-message.component.html',
  styleUrls: ['./contact-us-message.component.scss']
})
export class ContactUsMessageComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  Back(){
    this.router.navigate(['/']);
  }
}