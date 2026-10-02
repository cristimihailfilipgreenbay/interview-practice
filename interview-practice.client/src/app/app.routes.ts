import { Routes } from '@angular/router';

export const routes: Routes = [
  // Temporary until the Home page exists.
  { path: '', pathMatch: 'full', redirectTo: 'interviews/new' },
  {
    path: 'interviews',
    loadChildren: () =>
      import('./features/interviews/interviews.routes').then((m) => m.INTERVIEWS_ROUTES),
  },
];
