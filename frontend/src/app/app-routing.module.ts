import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/documents',
    pathMatch: 'full'
  },
  {
    path: 'documents',
    loadChildren: () => import('./features/documents/documents.module').then(m => m.DocumentsModule)
  },
  {
    path: '**',
    redirectTo: '/documents'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 