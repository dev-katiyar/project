import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { MessageService } from 'primeng/api';

@Injectable()

export class NotificationService {

  public selectedSymbolSource = new BehaviorSubject<string>(localStorage.getItem('currentSymbol') || 'AAPL');
  selectedSymbol = this.selectedSymbolSource.asObservable();

  constructor(private http: HttpClient, private messageService: MessageService) { }

  showError(error) {
    this.messageService.add({ severity: "error", detail: error, life: 1000 });
  }

  showStatus(response) {
    this.messageService.add({ severity: response.status, detail: response.message, life: 1500 });
  }
  showInfo(message) {
      this.messageService.add({ severity: "success", detail: message, life: 1500 });
    }

  changeSelectedSymbol(symbol: string) {
    this.selectedSymbolSource.next(symbol);
  }
  
}