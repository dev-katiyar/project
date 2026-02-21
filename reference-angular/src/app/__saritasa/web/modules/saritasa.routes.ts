import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/_guards';

export const saritasaRoutes: Routes = [
  {
    path: 'commentary',
    canActivate: [AuthGuard],
    loadChildren: () => import('./commentary/commentary.module').then(m => m.CommentaryModule),
  },
];
