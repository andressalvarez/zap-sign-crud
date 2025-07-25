import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { Subject, takeUntil, catchError, of, tap } from 'rxjs';
import { DocumentService } from '../../services/document.service';
import { DocumentListItem, Company } from '../../../../core/models/document.interface';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSortModule
  ],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit, OnDestroy {
  // Statistics properties
  totalDocuments = 0;
  pendingDocuments = 0;
  completedDocuments = 0;

  // Display columns for table (no longer needed with new design)
  displayedColumns: string[] = ['name', 'status', 'signers', 'created_by', 'created_at', 'actions'];

  private destroy$ = new Subject<void>();

  documents: DocumentListItem[] = [];
  filteredDocuments: DocumentListItem[] = [];
  companies: Company[] = [];
  loading = false;

  // Filtros y búsqueda
  searchTerm = '';
  statusFilter = '';
  companyFilter = '';

  constructor(
    private documentService: DocumentService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Leer query parameters de la URL
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['company']) {
          this.companyFilter = params['company'];
          console.log('🔍 Filtro de empresa aplicado:', this.companyFilter);
        }
                 this.loadCompanies();
         this.loadDocuments();
       });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCompanies(): void {
    this.documentService.getCompanies()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error cargando empresas:', error);
          return of({ results: [] });
        })
      )
      .subscribe(response => {
        this.companies = response.results;
      });
  }

  loadDocuments(): void {
    this.loading = true;

    this.documentService.getDocuments()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.snackBar.open(
            `Error al cargar documentos: ${error.message}`,
            'Cerrar',
            { duration: 5000 }
          );
          this.loading = false;
          return of({ results: [], count: 0, next: null, previous: null });
        }),
        tap(() => this.loading = false)
      )
      .subscribe(response => {
        this.documents = response.results;
        this.filteredDocuments = [...this.documents];
        this.updateStatistics();
        this.applyFilters(); // Aplicar filtros después de cargar
      });
  }

  updateStatistics(): void {
    this.totalDocuments = this.documents.length;
    this.pendingDocuments = this.documents.filter(doc => doc.status === 'pending' || doc.status === 'PENDING').length;
    this.completedDocuments = this.documents.filter(doc => doc.status === 'completed' || doc.status === 'COMPLETED').length;
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredDocuments = this.documents.filter(document => {
      const matchesSearch = !this.searchTerm ||
        document.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        document.created_by.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        document.company_name.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = !this.statusFilter ||
        document.status.toLowerCase() === this.statusFilter.toLowerCase();

      // Nuevo filtro por empresa usando company ID
      const matchesCompany = !this.companyFilter ||
        document.company_name === this.getCompanyNameById(parseInt(this.companyFilter)) ||
        document.company_name.toLowerCase().includes(this.companyFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesCompany;
    });
  }

  getCompanyNameById(companyId: number): string {
    const company = this.companies.find(c => c.id === companyId);
    return company ? company.name : '';
  }

  parseInt(value: string): number {
    return parseInt(value, 10);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.companyFilter = '';
    this.filteredDocuments = [...this.documents];
    // Actualizar la URL para remover el query parameter
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {},
      queryParamsHandling: 'merge'
    });
  }

  createNewDocument(): void {
    this.router.navigate(['/documents/create']);
  }

  viewDocument(id: number): void {
    this.router.navigate(['/documents', id]);
  }

  editDocument(id: number): void {
    this.router.navigate(['/documents', id, 'edit']);
  }

  deleteDocument(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar documento',
        message: '¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.documentService.deleteDocument(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Documento eliminado exitosamente', 'Cerrar', { duration: 3000 });
              this.loadDocuments();
            },
            error: (error) => {
              this.snackBar.open(`Error al eliminar documento: ${error.message}`, 'Cerrar', { duration: 5000 });
            }
          });
      }
    });
  }

  refreshDocuments(): void {
    this.loadDocuments();
  }

  updateDocumentStatus(id: number): void {
    this.documentService.updateDocumentStatus(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDocument) => {
          this.snackBar.open('Estado del documento actualizado', 'Cerrar', { duration: 3000 });
          this.loadDocuments();
        },
        error: (error) => {
          this.snackBar.open(`Error al actualizar estado: ${error.message}`, 'Cerrar', { duration: 5000 });
        }
      });
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | '' {
    switch (status.toLowerCase()) {
      case 'completed': return 'primary';
      case 'pending': return 'accent';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'check_circle';
      case 'pending': return 'schedule';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'Completado';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  }
}
