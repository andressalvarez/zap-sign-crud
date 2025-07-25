import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DocumentService } from './document.service';
import { ApiService } from '../../../core/services/api.service';
import { DocumentListItem, Document, DocumentCreateRequest, Company } from '../../../core/models/document.interface';
import { of } from 'rxjs';

describe('DocumentService', () => {
  let service: DocumentService;
  let httpMock: HttpTestingController;
  let apiService: jasmine.SpyObj<ApiService>;

  const mockCompany: Company = {
    id: 1,
    name: 'Test Company',
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    documents_count: 1
  };

  const mockDocumentListItem: DocumentListItem = {
    id: 1,
    name: 'Test Document',
    status: 'pending',
    signers_count: 2,
    created_by: 'Test User',
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    company_name: 'Test Company'
  };

  const mockDocument: Document = {
    id: 1,
    open_id: 123,
    token: 'test-token',
    name: 'Test Document',
    status: 'PENDING',
    created_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    created_by: 'Test User',
    company: mockCompany,
    external_id: 'ext-123',
    signers: []
  };

  beforeEach(() => {
    const apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'patch', 'delete']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DocumentService,
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    });

    service = TestBed.inject(DocumentService);
    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get documents', (done) => {
    const mockResponse = {
      results: [mockDocumentListItem],
      count: 1,
      next: null,
      previous: null
    };

    apiService.get.and.returnValue(of(mockResponse));

    service.getDocuments().subscribe(response => {
      expect(response).toEqual(mockResponse);
      expect(apiService.get).toHaveBeenCalledWith('documents/', jasmine.any(Object));
      done();
    });
  });

  it('should get documents with company filter', (done) => {
    const companyId = 1;
    const mockResponse = {
      results: [mockDocumentListItem],
      count: 1,
      next: null,
      previous: null
    };

    apiService.get.and.returnValue(of(mockResponse));

    service.getDocuments(companyId).subscribe(response => {
      expect(response).toEqual(mockResponse);
      expect(apiService.get).toHaveBeenCalledWith('documents/', jasmine.any(Object));
      done();
    });
  });

  it('should get single document', (done) => {
    const documentId = 1;

    apiService.get.and.returnValue(of(mockDocument));

    service.getDocument(documentId).subscribe(document => {
      expect(document).toEqual(mockDocument);
      expect(apiService.get).toHaveBeenCalledWith(`documents/${documentId}/`);
      done();
    });
  });

  it('should create document', (done) => {
    const documentData: DocumentCreateRequest = {
      name: 'New Document',
      pdf_url: 'https://example.com/test.pdf',
      company_id: 1,
      created_by: 'Test User',
      signers: []
    };

    apiService.post.and.returnValue(of(mockDocument));

    service.createDocument(documentData).subscribe(document => {
      expect(document).toEqual(mockDocument);
      expect(apiService.post).toHaveBeenCalledWith('documents/', documentData);
      done();
    });
  });

  it('should update document', (done) => {
    const documentId = 1;
    const updateData = { name: 'Updated Document' };

    apiService.patch.and.returnValue(of(mockDocument));

    service.updateDocument(documentId, updateData).subscribe(document => {
      expect(document).toEqual(mockDocument);
      expect(apiService.patch).toHaveBeenCalledWith(`documents/${documentId}/`, updateData);
      done();
    });
  });

  it('should update document status', (done) => {
    const documentId = 1;

    apiService.post.and.returnValue(of(mockDocument));

    service.updateDocumentStatus(documentId).subscribe(document => {
      expect(document).toEqual(mockDocument);
      expect(apiService.post).toHaveBeenCalledWith(`documents/${documentId}/update_status/`, {});
      done();
    });
  });

  it('should delete document', (done) => {
    const documentId = 1;

    apiService.delete.and.returnValue(of(null));

    service.deleteDocument(documentId).subscribe(result => {
      expect(result).toBeNull();
      expect(apiService.delete).toHaveBeenCalledWith(`documents/${documentId}/`);
      done();
    });
  });

  it('should refresh documents', () => {
    const mockResponse = {
      results: [mockDocumentListItem],
      count: 1,
      next: null,
      previous: null
    };

    apiService.get.and.returnValue(of(mockResponse));

    service.refreshDocuments();

    expect(apiService.get).toHaveBeenCalledWith('documents/', jasmine.any(Object));
  });

  it('should get documents count', () => {
    // Set up some test data in the BehaviorSubject
    service['documentsSubject'].next([mockDocumentListItem]);

    const count = service.getDocumentsCount();

    expect(count).toBe(1);
  });

  it('should filter documents by status', () => {
    // Set up some test data
    const documents = [
      { ...mockDocumentListItem, status: 'pending' },
      { ...mockDocumentListItem, id: 2, status: 'completed' }
    ];
    service['documentsSubject'].next(documents);

    const filtered = service.filterDocumentsByStatus('pending');

    expect(filtered.length).toBe(1);
    expect(filtered[0].status).toBe('pending');
  });

  it('should clear documents', () => {
    // Set up some test data
    service['documentsSubject'].next([mockDocumentListItem]);

    // Call the private method directly for testing
    service['documentsSubject'].next([]);

    expect(service.getDocumentsCount()).toBe(0);
  });
});
