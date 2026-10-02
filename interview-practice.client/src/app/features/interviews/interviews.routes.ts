import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes-guard';

export const INTERVIEWS_ROUTES: Routes = [
  {
    path: 'new',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/create-interview/create-interview').then((m) => m.CreateInterview),
  },
];
