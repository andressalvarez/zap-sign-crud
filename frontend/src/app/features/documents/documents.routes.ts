import { Routes } from '@angular/router';
import { DocumentListComponent } from './components/document-list/document-list.component';
import { DocumentCreateComponent } from './components/document-create/document-create.component';
import { DocumentDetailComponent } from './components/document-detail/document-detail.component';
import { DocumentEditComponent } from './components/document-edit/document-edit.component';

export const documentsRoutes: Routes = [
  {
    path: '',
    component: DocumentListComponent
  },
  {
    path: 'create',
    component: DocumentCreateComponent
  },
  {
    path: ':id/edit',
    component: DocumentEditComponent
  },
  {
    path: ':id',
    component: DocumentDetailComponent
  }
];
