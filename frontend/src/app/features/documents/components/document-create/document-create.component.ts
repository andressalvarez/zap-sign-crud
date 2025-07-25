import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, catchError, of, forkJoin } from 'rxjs';

// Material Design Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Services and Models
import { DocumentService } from '../../services/document.service';
import { Company } from '../../../../core/models/document.interface';
import { CompanyQuickManagerComponent } from '../company-quick-manager/company-quick-manager.component';

@Component({
  selector: 'app-document-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatCheckboxModule,
    MatDividerModule,
    MatExpansionModule,
    MatChipsModule,
    MatProgressBarModule
  ],
  templateUrl: './document-create.component.html',
  styleUrls: ['./document-create.component.scss']
})
export class DocumentCreateComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  documentForm!: FormGroup;
  companies: Company[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private documentService: DocumentService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCompanies().catch(error => console.error('Error loading companies on init:', error));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.documentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      pdf_url: ['', [
        Validators.required,
        Validators.pattern(/^https?:\/\/.+/)
      ]],
      created_by: ['', Validators.required],
      company_id: ['', Validators.required],
      signers: this.fb.array([this.createSignerForm()])
    });
  }

  private createSignerForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get signersArray(): FormArray {
    return this.documentForm.get('signers') as FormArray;
  }

  addSigner(): void {
    this.signersArray.push(this.createSignerForm());
    this.snackBar.open('Firmante agregado', '', { duration: 2000 });
  }

  removeSigner(index: number): void {
    if (this.signersArray.length > 1) {
      this.signersArray.removeAt(index);
      this.snackBar.open('Firmante eliminado', '', { duration: 2000 });
    }
  }

  private loadCompanies(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.documentService.getCompanies()
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            this.snackBar.open(
              `Error al cargar empresas: ${error.message}`,
              'Cerrar',
              { duration: 5000 }
            );
            reject(error);
            return of({ results: [] });
          })
        )
        .subscribe(response => {
          this.companies = response.results;

          // Preseleccionar la primera empresa si solo hay una
          if (this.companies.length === 1) {
            this.documentForm.patchValue({
              company_id: this.companies[0].id
            });
          }

          resolve();
        });
    });
  }

    onSubmit(): void {
    if (this.documentForm.valid) {
      this.createDocument();
    } else {
      this.markFormGroupTouched();
      this.snackBar.open(
        'Por favor completa todos los campos obligatorios correctamente',
        'Cerrar',
        { duration: 5000 }
      );
    }
  }

  private showDetailedError(title: string, message: string, status: number, technicalDetails: string, fullError: any): void {
    // Log completo para desarrolladores
    console.group('🚨 ERROR DETALLADO PARA DESARROLLADORES');
    console.error('❌ Título:', title);
    console.error('📝 Mensaje:', message);
    console.error('🔢 Status:', status);
    console.error('📄 Detalles técnicos:', technicalDetails);
    console.error('🔍 Error completo:', fullError);
    console.error('⏰ Timestamp:', new Date().toISOString());
    console.error('🌐 URL del error:', fullError?.url || 'N/A');
    console.error('📊 Headers:', fullError?.headers || 'N/A');
    console.groupEnd();

    // Crear mensaje detallado para el usuario
    let userMessage = `${title}\n\n${message}`;

    // Agregar información técnica útil
    if (status) {
      userMessage += `\n\n🔧 Información Técnica:`;
      userMessage += `\n• Código de Error: HTTP ${status}`;

      if (fullError?.url) {
        userMessage += `\n• Endpoint: ${fullError.url}`;
      }

      if (fullError?.statusText) {
        userMessage += `\n• Estado: ${fullError.statusText}`;
      }
    }

    // Mostrar detalles del servidor si están disponibles
    if (technicalDetails && technicalDetails !== '{}' && technicalDetails !== 'null') {
      try {
        const parsedDetails = JSON.parse(technicalDetails);
        userMessage += `\n\n📋 Detalles del Servidor:`;

        if (parsedDetails.detail) {
          userMessage += `\n• ${parsedDetails.detail}`;
        }

        if (parsedDetails.non_field_errors) {
          userMessage += `\n• Errores: ${parsedDetails.non_field_errors.join(', ')}`;
        }

        if (parsedDetails.pdf_url) {
          userMessage += `\n• PDF URL: ${parsedDetails.pdf_url.join(', ')}`;
        }

        if (parsedDetails.signers) {
          userMessage += `\n• Firmantes: ${JSON.stringify(parsedDetails.signers)}`;
        }
      } catch (e) {
        userMessage += `\n\n📋 Respuesta Servidor: ${technicalDetails}`;
      }
    }

    // Agregar timestamp para referencia
    userMessage += `\n\n⏰ Hora del Error: ${new Date().toLocaleString()}`;

    // Instrucciones para desarrolladores
    userMessage += `\n\n👨‍💻 Para Desarrolladores:`;
    userMessage += `\n• Revisa la consola del navegador para detalles completos`;
    userMessage += `\n• Usa "Copiar Error" para obtener información técnica`;

    // Mostrar en snackbar con opción de copiar
    this.snackBar.open(
      userMessage,
      'Copiar Error',
      {
        duration: 20000, // 20 segundos para leer todo el error
        panelClass: ['error-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    ).onAction().subscribe(() => {
      // Crear texto completo para copiar
      const copyText = `
=== ERROR DETALLADO ZAPSIGN CRUD ===
Título: ${title}
Mensaje: ${message}
Status: ${status}
URL: ${fullError?.url || 'N/A'}
StatusText: ${fullError?.statusText || 'N/A'}
Timestamp: ${new Date().toISOString()}

=== DETALLES TÉCNICOS ===
${technicalDetails}

=== ERROR COMPLETO ===
${JSON.stringify(fullError, null, 2)}
      `.trim();

      // Copiar al clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(copyText).then(() => {
          this.snackBar.open('✅ Error copiado al portapapeles', 'OK', { duration: 3000 });
        }).catch(() => {
          console.log('📋 ERROR PARA COPIAR:', copyText);
          this.snackBar.open('❌ Error al copiar. Ver consola.', 'OK', { duration: 3000 });
        });
      } else {
        console.log('📋 ERROR PARA COPIAR:', copyText);
        this.snackBar.open('❌ Clipboard no disponible. Ver consola.', 'OK', { duration: 3000 });
      }
    });


  }

  private createDocument(): void {
    this.loading = true;

    const formData = this.documentForm.value;

    this.documentService.createDocument(formData)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.loading = false;

          console.error('❌ Error completo en creación de documento:', error);
          console.log('🔍 DEBUG: error.error:', error.error);
          console.log('🔍 DEBUG: error.error?.code:', error.error?.code);
          console.log('🔍 DEBUG: error.error?.detail:', error.error?.detail);

          let errorMessage = 'Error al crear el documento';
          let errorType = 'Error Desconocido';
          let technicalDetails = '';

          // Capturar detalles técnicos para desarrolladores
          if (error.error) {
            technicalDetails = JSON.stringify(error.error, null, 2);
          } else if (error.message) {
            technicalDetails = error.message;
          }

          // Log detallado para debug
          console.error('📊 Detalles del error:', {
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            error: error.error,
            message: error.message,
            headers: error.headers
          });

          // Determinar tipo de error con mucho más detalle
          // PRIMERO: Revisar si es un error específico de ZapSign API
          // Buscar en error.error (HttpErrorResponse) O en error.message (JavaScript Error)
          const zapSignDetail = error.error?.detail || error.message || '';
          console.log('🔍 Detectando error ZapSign (combinado):', zapSignDetail);

          if (error.error?.code === 'ZAPSIGN_API_ERROR' ||
              zapSignDetail.includes('Failed to create document') ||
              zapSignDetail.includes('API token not found') ||
              zapSignDetail.includes('Token da API não encontrado') ||
              zapSignDetail.includes('Erro para baixar o seu arquivo')) {

            // Manejar errores específicos de ZapSign
            errorType = 'Error de ZapSign API';

            if (zapSignDetail.includes('404: Not Found') || zapSignDetail.includes('Erro para baixar o seu arquivo')) {
              errorType = '🔗 URL del PDF Inaccesible';
              errorMessage = 'La URL del PDF que proporcionaste no es accesible desde internet. Verifica que:\n\n• La URL sea correcta y esté escrita sin errores\n• El archivo PDF exista en esa ubicación\n• El servidor donde está alojado el PDF esté funcionando\n• La URL sea pública (no requiera autenticación)\n\nEjemplo de URL válida: https://www.ejemplo.com/documento.pdf';
              this.markFieldAsInvalid('pdf_url', 'URL del PDF no accesible desde internet');
            } else if (zapSignDetail.includes('403') ||
                       zapSignDetail.includes('API token not found') ||
                       zapSignDetail.includes('Token da API não encontrado')) {
              errorType = '🔑 Token de API Inválido';
              errorMessage = 'El token de ZapSign configurado para esta empresa no es válido. Para solucionarlo:\n\n• Ve a la configuración de la empresa\n• Verifica que el token de API sea correcto\n• Obtén un nuevo token desde tu cuenta de ZapSign\n• Asegúrate de copiar el token completo sin espacios\n\n¿Necesitas ayuda? Consulta: https://docs.zapsign.com.br';
              this.markCompanyFieldAsInvalid('Token de ZapSign inválido para esta empresa');
            } else {
              errorMessage = 'Error en la integración con ZapSign. Revisa la configuración.';
            }
          } else if (error.status === 502) {
            errorType = 'Error del Servidor (502 Bad Gateway)';
            if (error.error?.detail?.includes('Failed to create document') && error.error?.detail?.includes('Connection refused')) {
              errorMessage = 'ZapSign API no pudo descargar el PDF. Verifica que la URL sea pública y accesible desde internet.';
            } else {
              errorMessage = 'El servidor no puede conectarse con ZapSign API. Revisa la URL del PDF y que sea accesible.';
            }
          } else if (error.status === 400) {
            errorType = 'Error de Validación (400)';
            // Extraer mensaje específico del backend si existe
            if (error.error?.detail) {
              errorMessage = `Datos inválidos: ${error.error.detail}`;
            } else if (error.error?.non_field_errors) {
              errorMessage = `Error de validación: ${error.error.non_field_errors.join(', ')}`;
            } else if (error.error?.pdf_url) {
              errorMessage = `URL del PDF inválida: ${error.error.pdf_url.join(', ')}`;
            } else if (error.error?.signers) {
              errorMessage = `Error en firmantes: ${JSON.stringify(error.error.signers)}`;
            } else {
              errorMessage = 'Datos inválidos. Verifica que todos los campos estén correctos.';
            }
          } else if (error.status === 401) {
            errorType = 'Error de Autenticación (401)';
            errorMessage = 'Token de API inválido. Verifica que el token de ZapSign de la empresa sea correcto.';
          } else if (error.status === 403) {
            errorType = 'Error de Permisos (403)';
            errorMessage = 'Sin permisos para crear documentos. Verifica el token de API.';
          } else if (error.status === 422) {
            errorType = 'Error de ZapSign API (422)';
            errorMessage = 'ZapSign rechazó la solicitud. Verifica que la URL del PDF sea accesible y el formato sea correcto.';
          } else if (error.status === 500) {
            errorType = 'Error Interno del Servidor (500)';
            if (error.error?.detail) {
              errorMessage = `Error del servidor: ${error.error.detail}`;
            } else {
              errorMessage = 'Error interno del servidor. Intenta nuevamente.';
            }
          } else if (error.status === 0) {
            errorType = 'Error de Conexión';
            errorMessage = 'No se puede conectar al servidor. Verifica tu conexión a internet y que el backend esté ejecutándose.';
          } else if (error.error?.detail) {
            errorType = `Error HTTP ${error.status}`;
            errorMessage = error.error.detail;
          }

          // Mostrar error detallado (simplificado para errores conocidos)
          const isKnownError = errorType.includes('🔗') || errorType.includes('🔑');
          if (isKnownError) {
            // Para errores conocidos, mostrar solo el mensaje amigable
            this.showSimpleError(errorType, errorMessage);
          } else {
            // Para errores desconocidos, mostrar todos los detalles
            this.showDetailedError(errorType, errorMessage, error.status || 0, technicalDetails, error);
          }
          return of(null);
        })
      )
      .subscribe(response => {
        this.loading = false;

        if (response) {
          this.snackBar.open(
            `Documento "${response.name}" creado exitosamente`,
            'Ver',
            { duration: 5000 }
          ).onAction().subscribe(() => {
            this.router.navigate(['/documents', response.id]);
          });

          // Redirigir después de un momento
          setTimeout(() => {
            this.router.navigate(['/documents']);
          }, 3000);
        }
      });
  }

  saveDraft(): void {
    const name = this.documentForm.get('name')?.value;
    if (!name) {
      this.snackBar.open('Ingresa al menos el nombre del documento', 'Cerrar', { duration: 3000 });
      return;
    }

    // Guardar en localStorage como borrador
    const draftData = {
      ...this.documentForm.value,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem('document-draft', JSON.stringify(draftData));
    this.snackBar.open('Borrador guardado', 'Cerrar', { duration: 3000 });
  }

  private loadDraft(): void {
    const draft = localStorage.getItem('document-draft');
    if (draft) {
      try {
        const draftData = JSON.parse(draft);

        // Configurar el FormArray de firmantes
        while (this.signersArray.length < draftData.signers.length) {
          this.addSigner();
        }

        this.documentForm.patchValue(draftData);

        this.snackBar.open('Borrador cargado', 'Eliminar borrador', { duration: 5000 })
          .onAction().subscribe(() => {
            localStorage.removeItem('document-draft');
          });
      } catch (error) {
        localStorage.removeItem('document-draft');
      }
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.documentForm.controls).forEach(key => {
      const control = this.documentForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(groupControl => {
          if (groupControl instanceof FormGroup) {
            Object.keys(groupControl.controls).forEach(nestedKey => {
              groupControl.get(nestedKey)?.markAsTouched();
            });
          }
        });
      }
    });
  }

  // Validaciones personalizadas
  isFieldInvalid(fieldName: string): boolean {
    const field = this.documentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.documentForm.get(fieldName);
    if (field && field.errors) {
      // Errores personalizados de la API tienen prioridad
      if (field.errors['customError']) return field.errors['customError'];

      // Errores de validación estándar
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['email']) return 'Ingresa un email válido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) {
        if (fieldName === 'pdf_url') return 'Debe ser una URL válida (http:// o https://)';
        return 'Formato inválido';
      }
    }
    return '';
  }

  // Preview del PDF
  previewPdf(): void {
    const pdfUrl = this.documentForm.get('pdf_url')?.value;
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  }

  // Autocompletar ejemplos
  fillExample(): void {
    this.documentForm.patchValue({
      name: 'Contrato de Servicios Profesionales 2024',
      pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      created_by: 'Juan Carlos Administrador'
    });

    // Agregar un segundo firmante de ejemplo
    if (this.signersArray.length === 1) {
      this.addSigner();
    }

    this.signersArray.at(0).patchValue({
      name: 'María García López',
      email: 'maria.garcia@empresa.com'
    });

    this.signersArray.at(1).patchValue({
      name: 'Carlos Rodríguez Pérez',
      email: 'carlos.rodriguez@cliente.com'
    });

    this.snackBar.open('Ejemplo cargado', 'Cerrar', { duration: 3000 });
  }



  // Gestión rápida de empresas
  openCompanyManager(): void {
    const dialogRef = this.dialog.open(CompanyQuickManagerComponent, {
      width: '600px',
      maxHeight: '85vh',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'select') {
        // PRIMERO: Recargar la lista de empresas
        this.loadCompanies().then(() => {
          // DESPUÉS: Seleccionar la empresa en el dropdown
          setTimeout(() => {
            this.documentForm.patchValue({
              company_id: result.company.id
            });
            this.snackBar.open(`Empresa "${result.company.name}" seleccionada`, 'Cerrar', { duration: 3000 });
            console.log('✅ Empresa seleccionada:', result.company.name, 'ID:', result.company.id);
          }, 100);
        }).catch(() => {
          // Si hay error cargando empresas, aún así intentar seleccionar
          this.documentForm.patchValue({
            company_id: result.company.id
          });
          this.snackBar.open(`Empresa "${result.company.name}" seleccionada`, 'Cerrar', { duration: 3000 });
        });
      } else if (result && result.action === 'admin_companies') {
        // Navegar a administración de empresas
        this.router.navigate(['/admin/companies']);
      } else {
        // Si no hay acción específica, solo recargar empresas
        this.loadCompanies().catch(error => console.error('Error loading companies:', error));
      }
    });
  }

  /**
   * Muestra un error simple y amigable para errores conocidos
   */
  private showSimpleError(title: string, message: string): void {
    console.error(`🎯 Error conocido manejado: ${title} - ${message}`);

    this.snackBar.open(`${title}\n\n${message}`, 'Entendido', {
      duration: 15000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  /**
   * Marca un campo específico como inválido con un mensaje personalizado
   */
  private markFieldAsInvalid(fieldName: string, errorMessage: string): void {
    const control = this.documentForm.get(fieldName);
    if (control) {
      control.setErrors({ customError: errorMessage });
      control.markAsTouched();
    }
  }

  /**
   * Marca el campo de empresa como inválido
   */
  private markCompanyFieldAsInvalid(errorMessage: string): void {
    const control = this.documentForm.get('company_id');
    if (control) {
      control.setErrors({ customError: errorMessage });
      control.markAsTouched();
    }
  }
}
