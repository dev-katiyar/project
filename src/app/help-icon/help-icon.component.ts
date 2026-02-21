import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { HelpService } from '../help.service';

@Component({
  selector: 'app-help-icon',
  templateUrl: './help-icon.component.html',
  styleUrls: ['./help-icon.component.scss']
})
export class HelpIconComponent implements OnInit, OnChanges {

  @Input() style = {};
  @Input() key;
  helpMsg = '';

  constructor(private helpService: HelpService) { }

  ngOnInit(): void {
    this.helpMsg = this.helpService.getHelp(this.key);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.key !=null) {
      this.helpMsg = this.helpService.getHelp(this.key);
    }
  }

}
