import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentListComponent } from './components/document-list/document-list.component';
import { DocumentFormComponent } from './components/document-form/document-form.component';
import { DocumentDetailComponent } from './components/document-detail/document-detail.component';

const routes: Routes = [
  {
    path: '',
    component: DocumentListComponent,
    data: { title: 'Lista de Documentos' }
  },
  {
    path: 'create',
    component: DocumentFormComponent,
    data: { title: 'Crear Documento' }
  },
  {
    path: ':id',
    component: DocumentDetailComponent,
    data: { title: 'Detalles del Documento' }
  },
  {
    path: ':id/edit',
    component: DocumentFormComponent,
    data: { title: 'Editar Documento' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DocumentsRoutingModule { }
