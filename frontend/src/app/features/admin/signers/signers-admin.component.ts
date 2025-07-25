import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Signer } from '../../../core/models/document.interface';

interface SignerWithDocument {
  id: number;
  name: string;
  email: string;
  status: string;
  token?: string;
  created_at: string;
  last_updated_at: string;
  document_id: number;
  document_name: string;
  company_name: string;
}

@Component({
  selector: 'app-signers-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <!-- Header con diseño moderno -->
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <!-- Logo y título -->
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0">
                <div class="h-8 w-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                  <span class="text-white font-bold text-sm">ZS</span>
                </div>
              </div>
              <div>
                <h1 class="text-xl font-semibold text-gray-900">ZapSign CRUD</h1>
                <p class="text-sm text-gray-500">Administración de Firmantes</p>
              </div>
            </div>

            <!-- Navegación -->
            <div class="flex items-center space-x-4">
              <button routerLink="/documents"
                      class="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                Documentos
              </button>
              <button routerLink="/admin/companies"
                      class="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors">
                Empresas
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header de administración -->
        <div class="mb-8">
          <div class="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <mat-icon class="h-6 w-6">group</mat-icon>
                </div>
                <div>
                  <h2 class="text-2xl font-bold">Administración de Firmantes</h2>
                  <p class="text-purple-100 mt-1">Gestiona todos los firmantes del sistema</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold">{{ signers.length }}</div>
                <div class="text-purple-100 text-sm">Total firmantes</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Controles -->
        <div class="mb-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
          <!-- Búsqueda -->
          <div class="lg:col-span-2">
            <div class="relative">
              <input type="text"
                     [(ngModel)]="searchTerm"
                     (input)="filterSigners()"
                     placeholder="Buscar por nombre, email o documento..."
                     class="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <mat-icon class="absolute left-3 top-3.5 h-5 w-5 text-gray-400">search</mat-icon>
            </div>
          </div>

          <!-- Filtro por estado -->
          <div>
            <select [(ngModel)]="statusFilter"
                    (change)="filterSigners()"
                    class="block w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendiente</option>
              <option value="COMPLETED">Completado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          <!-- Botón crear -->
          <div>
            <button (click)="toggleCreateForm()"
                    class="w-full px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
              <mat-icon class="h-5 w-5">{{ showCreateForm ? 'close' : 'add' }}</mat-icon>
              <span>{{ showCreateForm ? 'Cancelar' : 'Nuevo Firmante' }}</span>
            </button>
          </div>
        </div>

        <!-- Formulario de crear/editar -->
        <div *ngIf="editingSigner" class="mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Editar Firmante: {{ editingSigner.name }}
            </h3>

            <form [formGroup]="signerForm" (ngSubmit)="onSubmit()">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nombre completo *</label>
                  <input type="text"
                         formControlName="name"
                         placeholder="Ej: Juan Pérez"
                         class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         [class.border-red-300]="isFieldInvalid('name')">
                  <p *ngIf="isFieldInvalid('name')" class="mt-1 text-sm text-red-600">{{ getFieldError('name') }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input type="email"
                         formControlName="email"
                         placeholder="juan@ejemplo.com"
                         class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         [class.border-red-300]="isFieldInvalid('email')">
                  <p *ngIf="isFieldInvalid('email')" class="mt-1 text-sm text-red-600">{{ getFieldError('email') }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
                  <select formControlName="status"
                          class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          [class.border-red-300]="isFieldInvalid('status')">
                    <option value="PENDING">Pendiente</option>
                    <option value="COMPLETED">Completado</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                  <p *ngIf="isFieldInvalid('status')" class="mt-1 text-sm text-red-600">{{ getFieldError('status') }}</p>
                </div>
              </div>

              <div class="mt-4 flex space-x-3">
                <button type="submit"
                        [disabled]="signerForm.invalid || saving"
                        class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                  <mat-icon class="h-4 w-4" *ngIf="!saving">{{ editingSigner ? 'save' : 'add' }}</mat-icon>
                  <mat-icon class="h-4 w-4 animate-spin" *ngIf="saving">refresh</mat-icon>
                  <span>{{ saving ? 'Guardando...' : (editingSigner ? 'Actualizar' : 'Crear') }}</span>
                </button>

                <button type="button"
                        (click)="cancelEdit()"
                        class="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Estadísticas rápidas -->
        <div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white rounded-xl p-4 border border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <mat-icon class="h-5 w-5 text-yellow-600">schedule</mat-icon>
              </div>
              <div>
                <div class="text-lg font-semibold text-gray-900">{{ getSignersByStatus('PENDING').length }}</div>
                <div class="text-xs text-gray-500">Pendientes</div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl p-4 border border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <mat-icon class="h-5 w-5 text-green-600">check_circle</mat-icon>
              </div>
              <div>
                <div class="text-lg font-semibold text-gray-900">{{ getSignersByStatus('COMPLETED').length }}</div>
                <div class="text-xs text-gray-500">Completados</div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl p-4 border border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <mat-icon class="h-5 w-5 text-red-600">cancel</mat-icon>
              </div>
              <div>
                <div class="text-lg font-semibold text-gray-900">{{ getSignersByStatus('CANCELLED').length }}</div>
                <div class="text-xs text-gray-500">Cancelados</div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl p-4 border border-gray-100">
            <div class="flex items-center space-x-3">
              <div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <mat-icon class="h-5 w-5 text-blue-600">group</mat-icon>
              </div>
              <div>
                <div class="text-lg font-semibold text-gray-900">{{ signers.length }}</div>
                <div class="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla de firmantes -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">
                Firmantes ({{ filteredSigners.length }} de {{ signers.length }})
              </h3>
              <button (click)="refreshSigners()"
                      class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
                <mat-icon class="h-4 w-4">refresh</mat-icon>
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <div *ngIf="loading" class="p-8 text-center">
            <mat-icon class="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4">refresh</mat-icon>
            <p class="text-gray-500">Cargando firmantes...</p>
          </div>

          <div *ngIf="!loading && filteredSigners.length === 0" class="p-8 text-center">
            <mat-icon class="h-12 w-12 text-gray-300 mx-auto mb-4">group_off</mat-icon>
            <p class="text-gray-500 mb-4">{{ searchTerm || statusFilter ? 'No se encontraron firmantes' : 'No hay firmantes registrados' }}</p>
            <p class="text-sm text-gray-400 mb-4">Los firmantes se crean automáticamente al crear documentos</p>
            <button routerLink="/documents/create"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Crear Documento
            </button>
          </div>

          <div *ngIf="!loading && filteredSigners.length > 0">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Firmante
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let signer of filteredSigners" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <mat-icon class="h-5 w-5 text-purple-600">person</mat-icon>
                      </div>
                      <div>
                        <div class="text-sm font-medium text-gray-900">{{ signer.name }}</div>
                        <div class="text-sm text-gray-500">{{ signer.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ signer.document_name }}</div>
                      <div class="text-sm text-gray-500">{{ signer.company_name }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          [ngClass]="{
                            'bg-yellow-100 text-yellow-800': signer.status === 'PENDING',
                            'bg-green-100 text-green-800': signer.status === 'COMPLETED',
                            'bg-red-100 text-red-800': signer.status === 'CANCELLED'
                          }">
                      {{ getStatusLabel(signer.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div *ngIf="signer.token" class="text-xs font-mono text-gray-500">
                      {{ signer.token.substring(0, 8) }}...
                    </div>
                    <div *ngIf="!signer.token" class="text-xs text-gray-400">
                      Sin token
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ signer.created_at | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end space-x-2">
                      <button (click)="viewSignerDocument(signer)"
                              class="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              matTooltip="Ver documento">
                        <mat-icon class="h-4 w-4">visibility</mat-icon>
                      </button>
                      <button (click)="editSigner(signer)"
                              class="text-yellow-600 hover:text-yellow-800 p-2 rounded-lg hover:bg-yellow-50 transition-colors"
                              matTooltip="Editar firmante">
                        <mat-icon class="h-4 w-4">edit</mat-icon>
                      </button>
                      <button (click)="deleteSigner(signer)"
                              class="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              matTooltip="Eliminar firmante">
                        <mat-icon class="h-4 w-4">delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SignersAdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  signers: SignerWithDocument[] = [];
  filteredSigners: SignerWithDocument[] = [];
  signerForm!: FormGroup;
  loading = false;
  saving = false;
  searchTerm = '';
  statusFilter = '';
  showCreateForm = false;
  editingSigner: SignerWithDocument | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadSigners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.signerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      status: ['PENDING', Validators.required]
    });
  }

  private loadSigners(): void {
    this.loading = true;
    // Cargar firmantes reales desde backend
    this.apiService.get<{ results: SignerWithDocument[] }>('/signers/').subscribe({
      next: (response) => {
        this.signers = response.results || [];
        this.filterSigners();
        this.loading = false;
      },
      error: (error) => {
        console.log('Error loading signers from backend:', error);
        // Si falla, mostrar mensaje y lista vacía
        this.signers = [];
        this.filterSigners();
        this.loading = false;
        this.snackBar.open('Error al cargar firmantes. Crea documentos primero para ver firmantes.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  filterSigners(): void {
    let filtered = [...this.signers];

    // Filtrar por término de búsqueda
    if (this.searchTerm.trim()) {
      filtered = filtered.filter(signer =>
        signer.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        signer.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        signer.document_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        signer.company_name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado
    if (this.statusFilter) {
      filtered = filtered.filter(signer => signer.status === this.statusFilter);
    }

    this.filteredSigners = filtered;
  }

  getSignersByStatus(status: string): SignerWithDocument[] {
    return this.signers.filter(signer => signer.status === status);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'COMPLETED': return 'Completado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.cancelEdit();
    }
  }

  onSubmit(): void {
    if (this.signerForm.valid && this.editingSigner) {
      this.saving = true;
      const signerData = {
        name: this.signerForm.get('name')?.value,
        email: this.signerForm.get('email')?.value,
        status: this.signerForm.get('status')?.value
      };

      // Actualizar firmante en la API
      this.apiService.put(`/signers/${this.editingSigner.id}/`, signerData).subscribe({
        next: (updatedSigner: any) => {
          const index = this.signers.findIndex(s => s.id === this.editingSigner!.id);
          if (index !== -1) {
            this.signers[index] = {
              ...this.signers[index],
              ...updatedSigner
            };
            this.filterSigners();
            this.cancelEdit();
            this.snackBar.open('Firmante actualizado exitosamente', 'Cerrar', { duration: 3000 });
          }
          this.saving = false;
        },
        error: (error) => {
          this.saving = false;
          console.error('Error updating signer:', error);
          this.snackBar.open('Error al actualizar el firmante. Intenta nuevamente.', 'Cerrar', { duration: 5000 });
        }
      });
    }
  }

  editSigner(signer: SignerWithDocument): void {
    this.editingSigner = signer;
    this.signerForm.patchValue({
      name: signer.name,
      email: signer.email,
      status: signer.status
    });
  }

  cancelEdit(): void {
    this.editingSigner = null;
    this.signerForm.reset({ status: 'PENDING' });
    this.showCreateForm = false;
  }

  deleteSigner(signer: SignerWithDocument): void {
    if (confirm(`¿Estás seguro de eliminar al firmante "${signer.name}"?`)) {
      const index = this.signers.findIndex(s => s.id === signer.id);
      if (index !== -1) {
        this.signers.splice(index, 1);
        this.filterSigners();
        this.snackBar.open('Firmante eliminado exitosamente', 'Cerrar', { duration: 3000 });
      }
    }
  }

  viewSignerDocument(signer: SignerWithDocument): void {
    this.router.navigate(['/documents', signer.document_id]);
  }

  refreshSigners(): void {
    this.loadSigners();
    this.snackBar.open('Lista actualizada', '', { duration: 2000 });
  }

  // Validaciones
  isFieldInvalid(fieldName: string): boolean {
    const field = this.signerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.signerForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['email']) return 'Ingresa un email válido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
