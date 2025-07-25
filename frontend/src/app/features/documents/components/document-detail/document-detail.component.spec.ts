import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { DocumentDetailComponent } from './document-detail.component';
import { DocumentService } from '../../services/document.service';

describe('DocumentDetailComponent (Logic Only)', () => {
  let component: DocumentDetailComponent;
  let documentService: jasmine.SpyObj<DocumentService>;

  const mockDocument = {
    id: 1,
    open_id: 123,
    token: 'test-token',
    name: 'Test Document',
    status: 'PENDING' as const,
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    created_by: 'Test User',
    company: {
      id: 1,
      name: 'Test Company',
      created_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      documents_count: 1
    },
    external_id: 'ext-123',
    signers: []
  };

  beforeEach(() => {
    const documentServiceSpy = jasmine.createSpyObj('DocumentService', ['getDocument']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      providers: [
        DocumentDetailComponent,
        { provide: DocumentService, useValue: documentServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { params: of({ id: '1' }) } },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    });

    component = TestBed.inject(DocumentDetailComponent);
    documentService = TestBed.inject(DocumentService) as jasmine.SpyObj<DocumentService>;

    documentService.getDocument.and.returnValue(of(mockDocument));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
