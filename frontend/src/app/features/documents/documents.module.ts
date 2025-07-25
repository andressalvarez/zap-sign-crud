import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';

import { DocumentsRoutingModule } from './documents-routing.module';
import { DocumentListComponent } from './components/document-list/document-list.component';
import { DocumentFormComponent } from './components/document-form/document-form.component';
import { DocumentDetailComponent } from './components/document-detail/document-detail.component';
import { DocumentService } from './services/document.service';

@NgModule({
  declarations: [
    DocumentListComponent,
    DocumentFormComponent,
    DocumentDetailComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    DocumentsRoutingModule
  ],
  providers: [
    DocumentService
  ]
})
export class DocumentsModule { }
