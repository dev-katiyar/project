import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-keystats',
  templateUrl: './keystats.component.html',
  styleUrls: ['./keystats.component.scss']
})
export class KeystatsComponent implements OnInit {

  @Input() keyStats:any;

 constructor() { }

  ngOnInit(): void {

  }

}
