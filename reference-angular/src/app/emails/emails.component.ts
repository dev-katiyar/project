import { Component, OnInit } from '@angular/core';
import { LiveService } from '../services/live.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-emails',
  templateUrl: './emails.component.html',
  styleUrls: ['./emails.component.scss']
})
export class EmailsComponent implements OnInit {
   loading = false;
   selectedCheckbox =[];
   message;

  constructor(private messageService: MessageService,private liveService: LiveService,) { }

  ngOnInit(): void {
  }

  showStatus(response) {
        this.messageService.add({ severity: response.status, detail: response.message, life: 1500 });
    }

  emailSubscription(action){
         this.liveService.postRequest("/email/subscription",{"action":action,'choices':this.selectedCheckbox}).subscribe(d=>this.setStatus(d));
  }


  setStatus(d){
        this.message = d.message;
        this.loading = false;
        if (d.status == 'success') {
              this.showStatus({ "status": "success", "message": d.message });
              }
        else
              this.showStatus({ "status": "error", "message": d.message });

  }

}
