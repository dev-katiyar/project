import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  public isLoading = new BehaviorSubject(false);

  // for letting applicaiotn know the current URL.
  // For some reason, router.event was not working when page is loaded for the firest time from browser URL bar.
  // it is working here, hence we are puttin git here for now.
  // url is needed by the topbar to find out which menu item need to be highlighted
  private currentURLSubject = new BehaviorSubject<string>('');
  public currentURLObs$: Observable<string> = this.currentURLSubject.asObservable();

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.emitCurrentURL(e.url);
      });
  }

  public emitCurrentURL(url: string): void {
    this.currentURLSubject.next(url);
  }
}
