import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { DocumentService } from '../../services/document.service';
import { Document, Signer, DocumentUpdateRequest } from '../../../../core/models/document.interface';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-document-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './document-edit.component.html',
  styleUrls: ['./document-edit.component.scss']
})
export class DocumentEditComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  documentId!: number;
  document: Document | null = null;
  documentForm!: FormGroup;
  signers: any[] = [];
  loading = false;
  saving = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private documentService: DocumentService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.documentId = +this.route.snapshot.params['id'];
    this.loadDocument();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.documentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      created_by: ['', Validators.required],
      status: ['pending', Validators.required]
    });
  }

  private loadDocument(): void {
    this.loading = true;
    this.error = null;

    this.documentService.getDocument(this.documentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.error = `Error al cargar el documento: ${error.message}`;
          this.loading = false;
          return of(null);
        })
      )
      .subscribe(document => {
        this.loading = false;
        if (document) {
          this.document = document;
          this.signers = [...(document.signers || [])];

          // Llenar el formulario con los datos existentes
          this.documentForm.patchValue({
            name: document.name,
            created_by: document.created_by,
            status: document.status
          });
        }
      });
  }

  onSubmit(): void {
    if (this.documentForm.valid && this.document) {
      this.saving = true;

      const updateData: DocumentUpdateRequest = {
        name: this.documentForm.get('name')?.value,
        created_by: this.documentForm.get('created_by')?.value,
        status: this.documentForm.get('status')?.value
      };

      this.documentService.updateDocument(this.documentId, updateData)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.saving = false;
            this.snackBar.open(`Error al actualizar: ${error.message}`, 'Cerrar', { duration: 5000 });
            return of(null);
          })
        )
        .subscribe(response => {
          this.saving = false;
          if (response) {
            this.snackBar.open('Documento actualizado exitosamente', 'Cerrar', { duration: 3000 });

            // Actualizar firmantes si hubo cambios
            this.updateSigners();
          }
        });
    } else {
      this.markFormGroupTouched();
      this.snackBar.open('Por favor completa todos los campos obligatorios', 'Cerrar', { duration: 3000 });
    }
  }

  private updateSigners(): void {
    // Actualizar firmantes uno por uno (simulando actualización local)
    this.signers.forEach((signer, index) => {
      if (signer.name && signer.email) {
        // En un escenario real, aquí llamarías a un endpoint para actualizar firmantes
        console.log(`Actualizando firmante ${index + 1}:`, signer);
      }
    });

    // Recargar el documento para mostrar cambios
    setTimeout(() => {
      this.loadDocument();
    }, 1000);
  }

  addSigner(): void {
    this.signers.push({
      name: '',
      email: '',
      status: 'PENDING'
    });
    this.snackBar.open('Firmante agregado', '', { duration: 2000 });
  }

  removeSigner(index: number): void {
    if (this.signers.length > 0) {
      this.signers.splice(index, 1);
      this.snackBar.open('Firmante eliminado', '', { duration: 2000 });
    }
  }

  deleteDocument(): void {
    if (!this.document) return;

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar documento',
        message: `¿Estás seguro de que deseas eliminar "${this.document.name}"? Esta acción no se puede deshacer.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.document) {
        this.documentService.deleteDocument(this.document.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Documento eliminado exitosamente', 'Cerrar', { duration: 3000 });
              this.router.navigate(['/documents']);
            },
            error: (error) => {
              this.snackBar.open(`Error al eliminar: ${error.message}`, 'Cerrar', { duration: 5000 });
            }
          });
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.documentForm.controls).forEach(key => {
      const control = this.documentForm.get(key);
      control?.markAsTouched();
    });
  }

  // Validaciones
  isFieldInvalid(fieldName: string): boolean {
    const field = this.documentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.documentForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
