import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService, ApiResponse } from '../../../core/services/api.service';
import {
  Document,
  DocumentListItem,
  DocumentCreateRequest,
  DocumentUpdateRequest,
  Company
} from '../../../core/models/document.interface';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private documentsSubject = new BehaviorSubject<DocumentListItem[]>([]);
  public documents$ = this.documentsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private apiService: ApiService) {}

  /**
   * Get all documents with optional filters
   */
  getDocuments(companyId?: number): Observable<ApiResponse<DocumentListItem>> {
    this.loadingSubject.next(true);

    let params = new HttpParams();
    if (companyId) {
      params = params.set('company_id', companyId.toString());
    }

    return this.apiService.get<ApiResponse<DocumentListItem>>('documents/', params)
      .pipe(
        tap(response => {
          this.documentsSubject.next(response.results);
          this.loadingSubject.next(false);
        })
      );
  }

  /**
   * Get document by ID with full details
   */
  getDocument(id: number): Observable<Document> {
    return this.apiService.get<Document>(`documents/${id}/`);
  }

  /**
   * Create new document with ZapSign integration
   */
  createDocument(documentData: DocumentCreateRequest): Observable<Document> {
    this.loadingSubject.next(true);

    return this.apiService.post<Document>('documents/', documentData)
      .pipe(
        tap(newDocument => {
          // Add new document to the list
          const currentDocuments = this.documentsSubject.value;
          const newDocumentListItem: DocumentListItem = {
            id: newDocument.id,
            name: newDocument.name,
            status: newDocument.status,
            created_at: newDocument.created_at,
            last_updated_at: newDocument.last_updated_at,
            created_by: newDocument.created_by,
            company_name: newDocument.company.name,
            signers_count: newDocument.signers.length
          };
          this.documentsSubject.next([newDocumentListItem, ...currentDocuments]);
          this.loadingSubject.next(false);
        })
      );
  }

  /**
   * Update document (local DB only)
   */
  updateDocument(id: number, updateData: DocumentUpdateRequest): Observable<Document> {
    return this.apiService.patch<Document>(`documents/${id}/`, updateData)
      .pipe(
        tap(updatedDocument => {
          // Update document in the list
          const currentDocuments = this.documentsSubject.value;
          const updatedList = currentDocuments.map(doc =>
            doc.id === id ? {
              ...doc,
              name: updatedDocument.name,
              status: updatedDocument.status,
              last_updated_at: updatedDocument.last_updated_at
            } : doc
          );
          this.documentsSubject.next(updatedList);
        })
      );
  }

  /**
   * Update document status from ZapSign API
   */
  updateDocumentStatus(id: number): Observable<Document> {
    return this.apiService.post<Document>(`documents/${id}/update_status/`, {})
      .pipe(
        tap(updatedDocument => {
          // Update document status in the list
          const currentDocuments = this.documentsSubject.value;
          const updatedList = currentDocuments.map(doc =>
            doc.id === id ? {
              ...doc,
              status: updatedDocument.status,
              last_updated_at: updatedDocument.last_updated_at
            } : doc
          );
          this.documentsSubject.next(updatedList);
        })
      );
  }

  /**
   * Delete document
   */
  deleteDocument(id: number): Observable<void> {
    return this.apiService.delete<void>(`documents/${id}/`)
      .pipe(
        tap(() => {
          // Remove document from the list
          const currentDocuments = this.documentsSubject.value;
          const filteredList = currentDocuments.filter(doc => doc.id !== id);
          this.documentsSubject.next(filteredList);
        })
      );
  }

  /**
   * Get all companies for document creation
   */
  getCompanies(): Observable<ApiResponse<Company>> {
    return this.apiService.get<ApiResponse<Company>>('companies/');
  }

  /**
   * Refresh documents list
   */
  refreshDocuments(): void {
    this.getDocuments().subscribe();
  }

  /**
   * Clear documents cache
   */
  clearCache(): void {
    this.documentsSubject.next([]);
  }

  /**
   * Get documents count
   */
  getDocumentsCount(): number {
    return this.documentsSubject.value.length;
  }

  /**
   * Filter documents by status
   */
  filterDocumentsByStatus(status: string): DocumentListItem[] {
    return this.documentsSubject.value.filter(doc => doc.status === status);
  }
}
