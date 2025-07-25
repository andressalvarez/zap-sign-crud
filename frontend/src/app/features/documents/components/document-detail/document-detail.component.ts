import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentService } from '../../services/document.service';
import { Document } from '../../../../core/models/document.interface';

@Component({
  selector: 'app-document-detail',
  templateUrl: './document-detail.component.html',
  styleUrls: ['./document-detail.component.scss']
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  document: Document | null = null;
  loading = false;
  updating = false;
  documentId: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private snackBar: MatSnackBar
  ) {
    this.documentId = +this.route.snapshot.params['id'];
  }

  ngOnInit(): void {
    this.loadDocument();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocument(): void {
    this.loading = true;
    this.documentService.getDocument(this.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (document) => {
          this.document = document;
          this.loading = false;
        },
        error: (error) => {
          this.snackBar.open(`Error al cargar documento: ${error.message}`, 'Cerrar', {
            duration: 5000
          });
          this.loading = false;
          this.router.navigate(['/documents']);
        }
      });
  }

  updateStatus(): void {
    if (!this.document) return;

    this.updating = true;
    this.documentService.updateDocumentStatus(this.document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDoc) => {
          this.document = updatedDoc;
          this.updating = false;
          this.snackBar.open(
            `Estado actualizado: ${updatedDoc.status}`,
            'Cerrar',
            { duration: 3000 }
          );
        },
        error: (error) => {
          this.updating = false;
          this.snackBar.open(
            `Error al actualizar estado: ${error.message}`,
            'Cerrar',
            { duration: 5000 }
          );
        }
      });
  }

  editDocument(): void {
    this.router.navigate(['/documents', this.documentId, 'edit']);
  }

  deleteDocument(): void {
    if (!this.document) return;

    const confirmed = confirm(`¿Estás seguro de eliminar el documento "${this.document.name}"?`);
    if (confirmed) {
      this.documentService.deleteDocument(this.document.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Documento eliminado exitosamente', 'Cerrar', {
              duration: 3000
            });
            this.router.navigate(['/documents']);
          },
          error: (error) => {
            this.snackBar.open(`Error al eliminar documento: ${error.message}`, 'Cerrar', {
              duration: 5000
            });
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/documents']);
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

  getSignerStatusColor(status: string): string {
    switch (status) {
      case 'SIGNED': return 'primary';
      case 'PENDING': return 'accent';
      case 'CANCELLED': return 'warn';
      default: return '';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES');
  }

  openPdfUrl(): void {
    if (this.document?.external_id) {
      // If we have external_id, we could construct ZapSign URL
      this.snackBar.open('Funcionalidad de visualización en desarrollo', 'Cerrar', {
        duration: 3000
      });
    }
  }

  getPendingSignersCount(): number {
    return this.document?.signers.filter(s => s.status === 'PENDING').length || 0;
  }

  getCompletedSignersCount(): number {
    return this.document?.signers.filter(s => s.status === 'SIGNED').length || 0;
  }

  getTotalSignersCount(): number {
    return this.document?.signers.length || 0;
  }

  getProgressPercentage(): number {
    const total = this.getTotalSignersCount();
    const completed = this.getCompletedSignersCount();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
