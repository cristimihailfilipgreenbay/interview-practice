import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
  },
  {
    path: 'interviews',
    loadChildren: () =>
      import('./features/interviews/interviews.routes').then((m) => m.INTERVIEWS_ROUTES),
  },
];
