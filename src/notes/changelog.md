Migration to Angular11 changes:

1.Changed import { Observable } from 'rxjs/Observable'
	to import { Observable } from 'rxjs'

2. Changed import 'rxjs/add/operator/do'
    to import { tap } from 'rxjs/operators'
    and .do
    to .pipe(tap())

2021-05-26 [AK]:

    1. Index.html - updated. Except 'googletagmanager' and 'stripe-checkout' scripts.

2021-05-28 [AK]:

    1. 'TopBarComponent' has been added to the 'app' component html.
    2. rxjs updated to 6.6.7. rxjs-compat 6.6.7 has been added as well. Do we want to do 7.x?
    3. 'FooterComponent' has been added to the 'app' component html.

2021-05-29/30 [AK]:
    1. Added WHOLE assets folder
    2. Added ChartIQ lib via a unique zip route.
    3. Updated 'Login' Component
    4. Updated 'Register' Component

2021-05-31 [AK]:
    1. Added 'modules > portfolio > components > modelportfolio > modelportfolio.component' & redacted 'portfolio.module'
    2. Added related services - 'portfolio' & 'zack' services
    3. Added related utils - 'common' & 'dateutils'
    4. Added 'moments' lib for 'dateutils' in 'package.json'

2021-05-01 [AK]:
    1. Theme and Layout changed by Priyanka.

2021-05-05 [AK]:
    1. Installed updated "angular-gauge": "^4.0.0" from "3.1.1"