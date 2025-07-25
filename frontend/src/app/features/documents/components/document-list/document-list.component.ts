import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentService } from '../../services/document.service';
import { DocumentListItem } from '../../../../core/models/document.interface';

@Component({
  selector: 'app-document-list',
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  documents: DocumentListItem[] = [];
  loading$ = this.documentService.loading$;

  displayedColumns: string[] = [
    'name',
    'status',
    'company_name',
    'signers_count',
    'created_by',
    'created_at',
    'actions'
  ];

  statusFilters = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDING_API', label: 'Pendiente API' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' },
    { value: 'API_ERROR', label: 'Error API' }
  ];

  selectedStatus = '';

  constructor(
    private documentService: DocumentService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDocuments();

    // Subscribe to documents changes
    this.documentService.documents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(documents => {
        this.documents = this.selectedStatus
          ? documents.filter(doc => doc.status === this.selectedStatus)
          : documents;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocuments(): void {
    this.documentService.getDocuments().subscribe({
      next: () => {
        this.snackBar.open('Documentos cargados exitosamente', 'Cerrar', {
          duration: 3000
        });
      },
      error: (error) => {
        this.snackBar.open(`Error al cargar documentos: ${error.message}`, 'Cerrar', {
          duration: 5000
        });
      }
    });
  }

  onStatusFilterChange(): void {
    const allDocuments = this.documentService.documents$.value;
    this.documents = this.selectedStatus
      ? allDocuments.filter(doc => doc.status === this.selectedStatus)
      : allDocuments;
  }

  createDocument(): void {
    this.router.navigate(['/documents/create']);
  }

  viewDocument(id: number): void {
    this.router.navigate(['/documents', id]);
  }

  editDocument(id: number): void {
    this.router.navigate(['/documents', id, 'edit']);
  }

  updateStatus(document: DocumentListItem): void {
    this.documentService.updateDocumentStatus(document.id).subscribe({
      next: (updatedDoc) => {
        this.snackBar.open(
          `Estado actualizado: ${updatedDoc.status}`,
          'Cerrar',
          { duration: 3000 }
        );
      },
      error: (error) => {
        this.snackBar.open(
          `Error al actualizar estado: ${error.message}`,
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }

  deleteDocument(document: DocumentListItem): void {
    if (confirm(`¿Estás seguro de eliminar el documento "${document.name}"?`)) {
      this.documentService.deleteDocument(document.id).subscribe({
        next: () => {
          this.snackBar.open('Documento eliminado exitosamente', 'Cerrar', {
            duration: 3000
          });
        },
        error: (error) => {
          this.snackBar.open(`Error al eliminar documento: ${error.message}`, 'Cerrar', {
            duration: 5000
          });
        }
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'primary';
      case 'PENDING': return 'accent';
      case 'CANCELLED': return 'warn';
      case 'API_ERROR': return 'warn';
      default: return '';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  refreshDocuments(): void {
    this.documentService.refreshDocuments();
  }
}
