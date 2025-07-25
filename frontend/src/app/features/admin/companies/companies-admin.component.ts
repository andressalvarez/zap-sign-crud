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
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Company } from '../../../core/models/document.interface';

@Component({
  selector: 'app-companies-admin',
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
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule
  ],
  template: `
    <!-- Header con diseño moderno -->
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
                <p class="text-sm text-gray-500">Administración de Empresas</p>
              </div>
            </div>

            <!-- Navegación -->
            <div class="flex items-center space-x-4">
              <button routerLink="/documents"
                      class="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                Documentos
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header de administración -->
        <div class="mb-8">
          <div class="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <mat-icon class="h-6 w-6">business</mat-icon>
                </div>
                <div>
                  <h2 class="text-2xl font-bold">Administración de Empresas</h2>
                  <p class="text-blue-100 mt-1">Gestiona todas las empresas del sistema</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold">{{ companies.length }}</div>
                <div class="text-blue-100 text-sm">Total empresas</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Controles -->
        <div class="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Búsqueda -->
          <div class="lg:col-span-2">
            <div class="relative">
              <input type="text"
                     [(ngModel)]="searchTerm"
                     (input)="filterCompanies()"
                     placeholder="Buscar empresas por nombre..."
                     class="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <mat-icon class="absolute left-3 top-3.5 h-5 w-5 text-gray-400">search</mat-icon>
            </div>
          </div>

          <!-- Botón crear -->
          <div>
            <button (click)="toggleCreateForm()"
                    class="w-full px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
              <mat-icon class="h-5 w-5">{{ showCreateForm ? 'close' : 'add' }}</mat-icon>
              <span>{{ showCreateForm ? 'Cancelar' : 'Nueva Empresa' }}</span>
            </button>
          </div>
        </div>

        <!-- Formulario de crear/editar -->
        <div *ngIf="showCreateForm || editingCompany" class="mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              {{ editingCompany ? 'Editar Empresa' : 'Crear Nueva Empresa' }}
            </h3>

            <form [formGroup]="companyForm" (ngSubmit)="onSubmit()">
              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nombre de la empresa *</label>
                  <input type="text"
                         formControlName="name"
                         placeholder="Ej: Mi Empresa S.A."
                         class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         [class.border-red-300]="isFieldInvalid('name')">
                  <p *ngIf="isFieldInvalid('name')" class="mt-1 text-sm text-red-600">{{ getFieldError('name') }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">API Token de ZapSign *</label>
                  <input type="text"
                         formControlName="api_token"
                         placeholder="fa895995-6797-49fe-8561-35102d37ba9bf44a60bf-0776-4dac-aeb6-cb97f4fc7632"
                         class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                         [class.border-red-300]="isFieldInvalid('api_token')">
                  <p *ngIf="isFieldInvalid('api_token')" class="mt-1 text-sm text-red-600">{{ getFieldError('api_token') }}</p>
                  <p class="mt-1 text-xs text-gray-500">Token de API obtenido desde <a href="https://sandbox.app.zapsign.com.br/" target="_blank" class="text-blue-600 hover:underline">ZapSign Sandbox</a></p>
                </div>

                <div class="flex items-center">
                  <div class="flex space-x-3">
                    <button type="submit"
                            [disabled]="companyForm.invalid || saving"
                            class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                      <mat-icon class="h-4 w-4" *ngIf="!saving">{{ editingCompany ? 'save' : 'add' }}</mat-icon>
                      <mat-icon class="h-4 w-4 animate-spin" *ngIf="saving">refresh</mat-icon>
                      <span>{{ saving ? 'Guardando...' : (editingCompany ? 'Actualizar' : 'Crear') }}</span>
                    </button>

                    <button type="button"
                            (click)="cancelEdit()"
                            class="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- Tabla de empresas -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">
                Empresas ({{ filteredCompanies.length }} de {{ companies.length }})
              </h3>
              <button (click)="refreshCompanies()"
                      class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
                <mat-icon class="h-4 w-4">refresh</mat-icon>
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <div *ngIf="loading" class="p-8 text-center">
            <mat-icon class="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4">refresh</mat-icon>
            <p class="text-gray-500">Cargando empresas...</p>
          </div>

          <div *ngIf="!loading && filteredCompanies.length === 0" class="p-8 text-center">
            <mat-icon class="h-12 w-12 text-gray-300 mx-auto mb-4">business_center</mat-icon>
            <p class="text-gray-500 mb-4">{{ searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas' }}</p>
            <button *ngIf="!searchTerm"
                    (click)="toggleCreateForm()"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Crear primera empresa
            </button>
          </div>

          <div *ngIf="!loading && filteredCompanies.length > 0">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creada
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actualizada
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let company of filteredCompanies" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <mat-icon class="h-5 w-5 text-blue-600">business</mat-icon>
                      </div>
                      <div>
                        <div class="text-sm font-medium text-gray-900">{{ company.name }}</div>
                        <div class="text-sm text-gray-500">ID: {{ company.id }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <mat-icon class="h-4 w-4 text-gray-400 mr-1">description</mat-icon>
                      <span class="text-sm text-gray-900">{{ company.documents_count || 0 }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ company.created_at | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ company.last_updated_at | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end space-x-2">
                      <button (click)="viewCompanyDocuments(company)"
                              class="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              matTooltip="Ver documentos">
                        <mat-icon class="h-4 w-4">visibility</mat-icon>
                      </button>
                      <button (click)="editCompany(company)"
                              class="text-yellow-600 hover:text-yellow-800 p-2 rounded-lg hover:bg-yellow-50 transition-colors"
                              matTooltip="Editar empresa">
                        <mat-icon class="h-4 w-4">edit</mat-icon>
                      </button>
                      <button (click)="deleteCompany(company)"
                              [disabled]="(company.documents_count || 0) > 0"
                              class="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              [matTooltip]="(company.documents_count || 0) > 0 ? 'No se puede eliminar: tiene documentos asociados' : 'Eliminar empresa'">
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
export class CompaniesAdminComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  companies: Company[] = [];
  filteredCompanies: Company[] = [];
  companyForm!: FormGroup;
  loading = false;
  saving = false;
  searchTerm = '';
  showCreateForm = false;
  editingCompany: Company | null = null;

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
    this.loadCompanies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      api_token: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  private loadCompanies(): void {
    this.loading = true;
    // Cargar empresas reales desde backend
    this.apiService.get<{ results: Company[] }>('/companies/').subscribe({
      next: (response) => {
        this.companies = response.results || [];
        this.filterCompanies();
        this.loading = false;
      },
      error: (error) => {
        console.log('Error loading companies from backend:', error);
        // Si falla, inicializar lista vacía
        this.companies = [];
        this.filterCompanies();
        this.loading = false;
        this.snackBar.open('Error al cargar empresas. Crea una nueva empresa para continuar.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  filterCompanies(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCompanies = [...this.companies];
    } else {
      this.filteredCompanies = this.companies.filter(company =>
        company.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.cancelEdit();
    }
  }

  onSubmit(): void {
    if (this.companyForm.valid) {
      this.saving = true;
      const companyData = {
        name: this.companyForm.get('name')?.value,
        api_token: this.companyForm.get('api_token')?.value
      };

      if (this.editingCompany) {
        // Actualizar empresa real en la API
        this.apiService.put<Company>(`/companies/${this.editingCompany.id}/`, companyData).subscribe({
          next: (updatedCompany) => {
            const index = this.companies.findIndex(c => c.id === this.editingCompany!.id);
            if (index !== -1) {
              this.companies[index] = {
                ...updatedCompany,
                documents_count: this.companies[index].documents_count
              };
              this.filterCompanies();
              this.cancelEdit();
              this.snackBar.open('Empresa actualizada exitosamente', 'Cerrar', { duration: 3000 });
            }
            this.saving = false;
          },
          error: (error) => {
            this.saving = false;
            console.error('Error updating company:', error);
            this.snackBar.open('Error al actualizar la empresa. Intenta nuevamente.', 'Cerrar', { duration: 5000 });
          }
        });
      } else {
        // Crear empresa real en la API
        this.apiService.post<Company>('/companies/', companyData).subscribe({
          next: (newCompany) => {
            // Agregar la nueva empresa a la lista local
            this.companies.unshift({
              ...newCompany,
              documents_count: 0
            });
            this.filterCompanies();
            this.companyForm.reset();
            this.showCreateForm = false;
            this.saving = false;
            this.snackBar.open(`Empresa "${newCompany.name}" creada exitosamente`, 'Cerrar', { duration: 3000 });
          },
          error: (error) => {
            this.saving = false;
            console.error('Error creating company:', error);
            this.snackBar.open('Error al crear la empresa. Intenta nuevamente.', 'Cerrar', { duration: 5000 });
          }
        });
      }
    }
  }

  editCompany(company: Company): void {
    this.editingCompany = company;
    this.showCreateForm = true;
    this.companyForm.patchValue({
      name: company.name,
      api_token: (company as any).api_token || ''
    });
  }

  cancelEdit(): void {
    this.editingCompany = null;
    this.companyForm.reset();
    this.showCreateForm = false;
  }

  deleteCompany(company: Company): void {
    if ((company.documents_count || 0) > 0) {
      this.snackBar.open('No se puede eliminar: la empresa tiene documentos asociados', 'Cerrar', { duration: 4000 });
      return;
    }

    if (confirm(`¿Estás seguro de eliminar "${company.name}"?`)) {
      // Eliminar empresa real de la API
      this.apiService.delete(`/companies/${company.id}/`).subscribe({
        next: () => {
          const index = this.companies.findIndex(c => c.id === company.id);
          if (index !== -1) {
            this.companies.splice(index, 1);
            this.filterCompanies();
            this.snackBar.open('Empresa eliminada exitosamente', 'Cerrar', { duration: 3000 });
          }
        },
        error: (error) => {
          console.error('Error deleting company:', error);
          this.snackBar.open('Error al eliminar la empresa. Intenta nuevamente.', 'Cerrar', { duration: 5000 });
        }
      });
    }
  }

  viewCompanyDocuments(company: Company): void {
    this.router.navigate(['/documents'], { queryParams: { company: company.id } });
  }

  refreshCompanies(): void {
    this.loadCompanies();
    this.snackBar.open('Lista actualizada', '', { duration: 2000 });
  }

  // Validaciones
  isFieldInvalid(fieldName: string): boolean {
    const field = this.companyForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.companyForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
