import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-rating-bar',
  templateUrl: './rating-bar.component.html',
  styleUrls: ['./rating-bar.component.scss']
})
export class RatingBarComponent implements OnInit {

  @Input('name') name = '';
  @Input('ratingValue') ratingValue: 0;
  @Input('ratingText') ratingText: '';
  @Input('ratingBarHeight') ratingBarHeight = '0.5rem';

  constructor() { }

  ngOnInit(): void {
  }

  getRatingClass(value) {
    if (value == 1) {
      return "red";
    }
    else if (value == 2) {
      return "orange";
    }
    else if (value == 3) {
      return "light-green";
    }
    else if (value == 4) {
      return "green";
    }
  }

  getRatingStyle() {
    return {height: this.ratingBarHeight};
  }

}
