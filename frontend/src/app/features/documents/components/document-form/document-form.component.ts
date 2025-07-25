import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentService } from '../../services/document.service';
import { Company, DocumentCreateRequest, Document } from '../../../../core/models/document.interface';

@Component({
  selector: 'app-document-form',
  templateUrl: './document-form.component.html',
  styleUrls: ['./document-form.component.scss']
})
export class DocumentFormComponent implements OnInit {
  documentForm: FormGroup;
  companies: Company[] = [];
  loading = false;
  submitting = false;
  
  // AGREGADO: Modo edición
  isEditMode = false;
  documentId: number | null = null;
  currentDocument: Document | null = null;

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentService,
    private router: Router,
    private route: ActivatedRoute,  // AGREGADO
    private snackBar: MatSnackBar
  ) {
    this.documentForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCompanies();
    this.checkEditMode();  // AGREGADO
  }

  // AGREGADO: Detectar modo edición
  private checkEditMode(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.documentId = +id;
      this.loadDocumentForEdit();
    }
    this.updateValidators(); // Llamar después de establecer el modo
  }

  // AGREGADO: Cargar documento para edición
  private loadDocumentForEdit(): void {
    if (!this.documentId) return;

    this.loading = true;
    this.documentService.getDocument(this.documentId).subscribe({
      next: (document) => {
        this.currentDocument = document;
        this.populateForm(document);
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

  // AGREGADO: Llenar formulario con datos existentes
  private populateForm(document: Document): void {
    this.documentForm.patchValue({
      name: document.name,
      company_id: document.company.id,
      created_by: document.created_by
    });

    // Llenar firmantes existentes
    const signersArray = this.signers;
    signersArray.clear();
    
    document.signers.forEach(signer => {
      signersArray.push(this.fb.group({
        name: [signer.name, [Validators.required, Validators.minLength(2)]],
        email: [signer.email, [Validators.required, Validators.email]]
      }));
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      pdf_url: [''], // Se validará condicionalmente en ngOnInit
      company_id: [''], // Se validará condicionalmente en ngOnInit  
      created_by: ['', [Validators.required]],
      signers: this.fb.array([this.createSignerForm()], [Validators.minLength(1)])
    });
  }

  // AGREGADO: Actualizar validadores según el modo
  private updateValidators(): void {
    const pdfUrlControl = this.documentForm.get('pdf_url');
    const companyIdControl = this.documentForm.get('company_id');
    const signersControl = this.documentForm.get('signers');

    if (this.isEditMode) {
      // En modo edición, estos campos no son requeridos
      pdfUrlControl?.clearValidators();
      companyIdControl?.clearValidators();
      signersControl?.clearValidators();
    } else {
      // En modo creación, aplicar validaciones completas
      pdfUrlControl?.setValidators([Validators.required, this.pdfUrlValidator]);
      companyIdControl?.setValidators([Validators.required]);
      signersControl?.setValidators([Validators.minLength(1)]);
    }

    pdfUrlControl?.updateValueAndValidity();
    companyIdControl?.updateValueAndValidity();
    signersControl?.updateValueAndValidity();
  }

  private createSignerForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private pdfUrlValidator(control: any) {
    if (!control.value) return null;

    const url = control.value.toLowerCase();
    if (!url.includes('.pdf')) {
      return { invalidPdfUrl: true };
    }

    // Basic URL validation
    try {
      new URL(control.value);
      return null;
    } catch {
      return { invalidUrl: true };
    }
  }

  get signers(): FormArray {
    return this.documentForm.get('signers') as FormArray;
  }

  loadCompanies(): void {
    this.loading = true;
    this.documentService.getCompanies().subscribe({
      next: (response) => {
        this.companies = response.results;
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open(`Error al cargar empresas: ${error.message}`, 'Cerrar', {
          duration: 5000
        });
        this.loading = false;
      }
    });
  }

  addSigner(): void {
    if (this.signers.length < 10) { // Limit to 10 signers
      this.signers.push(this.createSignerForm());
    } else {
      this.snackBar.open('Máximo 10 firmantes permitidos', 'Cerrar', {
        duration: 3000
      });
    }
  }

  removeSigner(index: number): void {
    if (this.signers.length > 1) {
      this.signers.removeAt(index);
    } else {
      this.snackBar.open('Al menos un firmante es requerido', 'Cerrar', {
        duration: 3000
      });
    }
  }

  getSignerFormGroup(index: number): FormGroup {
    return this.signers.at(index) as FormGroup;
  }

  getFieldError(fieldName: string): string {
    const field = this.documentForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['invalidPdfUrl']) return 'La URL debe apuntar a un archivo PDF';
      if (field.errors['invalidUrl']) return 'URL inválida';
    }
    return '';
  }

  getSignerFieldError(signerIndex: number, fieldName: string): string {
    const signerGroup = this.getSignerFormGroup(signerIndex);
    const field = signerGroup.get(fieldName);

    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.documentForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  hasSignerFieldError(signerIndex: number, fieldName: string): boolean {
    const signerGroup = this.getSignerFormGroup(signerIndex);
    const field = signerGroup.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  checkDuplicateEmails(): boolean {
    const emails = this.signers.value.map((signer: any) => signer.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    return emails.length !== uniqueEmails.size;
  }

  onSubmit(): void {
    if (this.documentForm.valid) {
      if (this.checkDuplicateEmails()) {
        this.snackBar.open('No se permiten emails duplicados', 'Cerrar', {
          duration: 5000
        });
        return;
      }

      this.submitting = true;
      const formValue = this.documentForm.value;

      if (this.isEditMode && this.documentId) {
        // MODO EDICIÓN - Solo actualizar campos locales
        const updateData = {
          name: formValue.name.trim(),
          created_by: formValue.created_by.trim()
        };

        this.documentService.updateDocument(this.documentId, updateData).subscribe({
          next: (document) => {
            this.snackBar.open(
              `Documento "${document.name}" actualizado exitosamente`,
              'Cerrar',
              { duration: 5000 }
            );
            this.router.navigate(['/documents']);
          },
          error: (error) => {
            this.snackBar.open(`Error al actualizar documento: ${error.message}`, 'Cerrar', {
              duration: 8000
            });
            this.submitting = false;
          }
        });
      } else {
        // MODO CREACIÓN - Integración con ZapSign
        const documentData: DocumentCreateRequest = {
          name: formValue.name.trim(),
          pdf_url: formValue.pdf_url.trim(),
          company_id: parseInt(formValue.company_id),
          created_by: formValue.created_by.trim(),
          signers: formValue.signers.map((signer: any) => ({
            name: signer.name.trim(),
            email: signer.email.trim().toLowerCase()
          }))
        };

        this.documentService.createDocument(documentData).subscribe({
          next: (document) => {
            this.snackBar.open(
              `Documento "${document.name}" creado exitosamente con ZapSign`,
              'Cerrar',
              { duration: 5000 }
            );
            this.router.navigate(['/documents']);
          },
          error: (error) => {
            let errorMessage = 'Error al crear documento';

            if (error.message.includes('ZapSign API Error')) {
              errorMessage = 'Error al conectar con ZapSign. Verifique la URL del PDF y la configuración.';
            } else if (error.message.includes('Bad Request')) {
              errorMessage = 'Datos inválidos. Verifique todos los campos.';
            }

            this.snackBar.open(`${errorMessage}: ${error.message}`, 'Cerrar', {
              duration: 8000
            });
            this.submitting = false;
          }
        });
      }
    } else {
      this.markFormGroupTouched(this.documentForm);
      this.snackBar.open('Por favor complete todos los campos requeridos', 'Cerrar', {
        duration: 5000
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/documents']);
  }

  // Example PDF URLs for testing
  fillExampleData(): void {
    this.documentForm.patchValue({
      name: 'Contrato de Prueba ZapSign',
      pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      created_by: 'Usuario Demo'
    });

    // Fill first signer with example data
    if (this.signers.length > 0) {
      this.getSignerFormGroup(0).patchValue({
        name: 'Juan Pérez',
        email: 'juan.perez@example.com'
      });
    }
  }

  // AGREGADO: Método para colores de estado de firmantes
  getSignerStatusColor(status: string): string {
    switch (status) {
      case 'SIGNED': return 'primary';
      case 'PENDING': return 'accent';
      case 'CANCELLED': return 'warn';
      default: return '';
    }
  }
}
