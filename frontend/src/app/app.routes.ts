import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/documents',
    pathMatch: 'full'
  },
  {
    path: 'documents',
    loadChildren: () => import('./features/documents/documents.routes').then(m => m.documentsRoutes)
  },
  {
    path: 'admin/companies',
    loadComponent: () => import('./features/admin/companies/companies-admin.component').then(m => m.CompaniesAdminComponent)
  },
  {
    path: 'admin/signers',
    redirectTo: '/documents',
    pathMatch: 'full'
  }
];
