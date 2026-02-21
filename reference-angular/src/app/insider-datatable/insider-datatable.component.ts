import { Component, OnInit, Input } from '@angular/core';
import {TechnicalService} from '../services/technical.service';

@Component({
  selector: 'insider-datatable',
  templateUrl: './insider-datatable.component.html',
  styleUrls: ['./insider-datatable.component.scss']
})
export class InsiderDatatableComponent implements OnInit {

  @Input() data;

  constructor(private technicalService:TechnicalService) { }

  ngOnInit(): void {
  }

}
