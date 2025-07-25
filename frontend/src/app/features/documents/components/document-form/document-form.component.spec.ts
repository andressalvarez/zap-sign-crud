import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { DocumentFormComponent } from './document-form.component';
import { DocumentService } from '../../services/document.service';

describe('DocumentFormComponent (Logic Only)', () => {
  let component: DocumentFormComponent;
  let documentService: jasmine.SpyObj<DocumentService>;

  beforeEach(() => {
    const documentServiceSpy = jasmine.createSpyObj('DocumentService', ['getCompanies']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        DocumentFormComponent,
        FormBuilder,
        { provide: DocumentService, useValue: documentServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { params: of({}), snapshot: { params: {} } } },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    });

    component = TestBed.inject(DocumentFormComponent);
    documentService = TestBed.inject(DocumentService) as jasmine.SpyObj<DocumentService>;

    documentService.getCompanies.and.returnValue(of({
      results: [],
      count: 0,
      next: null,
      previous: null
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form on ngOnInit', () => {
    component.ngOnInit();
    expect(component.documentForm).toBeDefined();
  });
});
