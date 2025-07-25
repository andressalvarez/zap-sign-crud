import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { DocumentService } from '../../services/document.service';
import { Document } from '../../../../core/models/document.interface';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatTooltipModule,
    MatExpansionModule,
    MatDialogModule
  ],
  templateUrl: './document-detail.component.html',
  styleUrls: ['./document-detail.component.scss']
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  document: Document | null = null;
  loading = true;
  updatingStatus = false;
  error: string | null = null;
  documentId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.documentId = +params['id'];
      this.loadDocument();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocument(): void {
    this.loading = true;
    this.error = null;

    this.documentService.getDocument(this.documentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.loading = false;
          this.error = error.error?.detail || 'Error al cargar el documento';
          this.snackBar.open(this.error!, 'Cerrar', { duration: 5000 });
          return of(null);
        })
      )
      .subscribe(document => {
        this.loading = false;
        if (document) {
          this.document = document;
        }
      });
  }

  refreshDocument(): void {
    this.snackBar.open('Recargando información...', '', { duration: 2000 });
    this.loadDocument();
  }

  updateStatus(): void {
    if (!this.document) return;

    this.updatingStatus = true;
    this.snackBar.open('Actualizando estado desde ZapSign...', '', { duration: 2000 });

    this.documentService.updateDocumentStatus(this.document.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.updatingStatus = false;
          this.snackBar.open(
            `Error al actualizar estado: ${error.message}`,
            'Cerrar',
            { duration: 5000 }
          );
          return of(null);
        })
      )
      .subscribe(updatedDoc => {
        this.updatingStatus = false;
        if (updatedDoc) {
          this.document = updatedDoc;
          this.snackBar.open(
            'Estado actualizado exitosamente',
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
  }

  deleteDocument(): void {
    if (!this.document) return;

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: { documentName: this.document.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.document) {
        this.performDelete();
      }
    });
  }

  private performDelete(): void {
    if (!this.document) return;

    this.documentService.deleteDocument(this.document.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.snackBar.open(
            `Error al eliminar documento: ${error.message}`,
            'Cerrar',
            { duration: 5000 }
          );
          return of(null);
        })
      )
      .subscribe(() => {
        this.snackBar.open(
          `Documento "${this.document!.name}" eliminado exitosamente`,
          'Cerrar',
          { duration: 3000 }
        );
        this.router.navigate(['/documents']);
      });
  }

  copyToken(): void {
    if (this.document?.token) {
      navigator.clipboard.writeText(this.document.token).then(() => {
        this.snackBar.open('Token copiado al portapapeles', '', { duration: 2000 });
      }).catch(() => {
        this.snackBar.open('Error al copiar token', 'Cerrar', { duration: 3000 });
      });
    }
  }

  copySignerToken(token: string): void {
    navigator.clipboard.writeText(token).then(() => {
      this.snackBar.open('Token del firmante copiado', '', { duration: 2000 });
    }).catch(() => {
      this.snackBar.open('Error al copiar token', 'Cerrar', { duration: 3000 });
    });
  }

  // Métodos para estados del documento
  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | '' {
    switch (status) {
      case 'completed': return 'primary';
      case 'pending': return 'accent';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'pending': return 'schedule';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completado';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  }

  // Métodos para estados de firmantes
  getSignerStatusColor(status: string): 'primary' | 'accent' | 'warn' | '' {
    switch (status.toUpperCase()) {
      case 'SIGNED': return 'primary';
      case 'PENDING': return 'accent';
      case 'CANCELLED': return 'warn';
      case 'DECLINED': return 'warn';
      default: return '';
    }
  }

  getSignerStatusIcon(status: string): string {
    switch (status.toUpperCase()) {
      case 'SIGNED': return 'check_circle';
      case 'PENDING': return 'schedule';
      case 'CANCELLED': return 'cancel';
      case 'DECLINED': return 'thumb_down';
      default: return 'help';
    }
  }

  getSignerStatusLabel(status: string): string {
    switch (status.toUpperCase()) {
      case 'SIGNED': return 'Firmado';
      case 'PENDING': return 'Pendiente';
      case 'CANCELLED': return 'Cancelado';
      case 'DECLINED': return 'Rechazado';
      default: return status;
    }
  }

  // Estadísticas
  getCompletedSignersCount(): number {
    return this.document?.signers.filter(s => s.status.toUpperCase() === 'SIGNED').length || 0;
  }

  getPendingSignersCount(): number {
    return this.document?.signers.filter(s => s.status.toUpperCase() === 'PENDING').length || 0;
  }

  getTotalSignersCount(): number {
    return this.document?.signers.length || 0;
  }

  getProgressPercentage(): number {
    const total = this.getTotalSignersCount();
    if (total === 0) return 0;
    return Math.round((this.getCompletedSignersCount() / total) * 100);
  }
}
