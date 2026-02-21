import {Component, OnInit} from '@angular/core';
import {PrimeNGConfig} from 'primeng/api';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{

    title = 'angulartitle';

    menuMode = 'horizontal';

    colorScheme = 'light';

    theme = 'blue-light';

    inputStyle = 'outlined';

    ripple: boolean;

    constructor(
        private primengConfig: PrimeNGConfig,
        private titleService: Title,
        private router: Router,
        private activatedRoute: ActivatedRoute,
    ) { }

    ngOnInit() {
        this.primengConfig.ripple = true;

        const appTitle = this.titleService.getTitle();
        this.router
            .events.pipe(
                filter(event => event instanceof NavigationEnd),
                map(() => {
                    let child = this.activatedRoute.firstChild;
                    while (child.firstChild) {
                        child = child.firstChild;
                    }
                    if (child.snapshot.data['title']) {
                        return child.snapshot.data['title'];
                    }
                    return appTitle;
                })
            ).subscribe((ttl: string) => {
                this.titleService.setTitle('SimpleVisor - ' + ttl);
            });
    }
}
