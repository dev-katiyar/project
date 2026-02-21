import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationService } from './services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class SymbolPopupService {
  constructor(private notificationService: NotificationService) { }

  private popupToggleSubject = new BehaviorSubject<string>('');
  public popupToggleObservable$: Observable<string> = this.popupToggleSubject.asObservable();

  public showPopup(symbol: string): void {
    localStorage.setItem('currentSymbol', symbol);
    this.notificationService.changeSelectedSymbol(symbol);
    this.popupToggleSubject.next(symbol);
  }
}
