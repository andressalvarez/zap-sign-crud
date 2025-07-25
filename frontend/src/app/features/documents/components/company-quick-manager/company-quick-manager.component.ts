import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../../core/services/api.service';
import { Company } from '../../../../core/models/document.interface';

@Component({
  selector: 'app-company-quick-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="max-w-lg">
      <!-- Header compacto -->
      <div class="flex items-center space-x-3 p-4 border-b border-gray-200">
        <div class="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <mat-icon class="h-5 w-5 text-white">business</mat-icon>
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold text-gray-900">Gestión de Empresas</h2>
          <p class="text-xs text-gray-500">Crear, editar, eliminar y buscar empresas</p>
        </div>
        <button (click)="onClose()" class="p-2 hover:bg-gray-100 rounded-lg">
          <mat-icon class="h-4 w-4 text-gray-500">close</mat-icon>
        </button>
      </div>

      <div class="p-4 space-y-4">
        <!-- Crear/Editar empresa -->
        <div class="bg-blue-50 rounded-lg p-3">
          <h3 class="text-sm font-medium text-gray-900 mb-2">
            {{ editingCompany ? 'Editar Empresa' : 'Crear Nueva Empresa' }}
          </h3>
          <form [formGroup]="companyForm" (ngSubmit)="onSubmitCompany()">
            <div class="space-y-2">
              <input type="text"
                     formControlName="name"
                     placeholder="Nombre de la empresa"
                     class="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     [class.border-red-300]="isFieldInvalid('name')">
              <p *ngIf="isFieldInvalid('name')" class="text-xs text-red-600">{{ getFieldError('name') }}</p>

              <input type="text"
                     formControlName="api_token"
                     placeholder="API Token de ZapSign"
                     class="block w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                     [class.border-red-300]="isFieldInvalid('api_token')">
              <p *ngIf="isFieldInvalid('api_token')" class="text-xs text-red-600">{{ getFieldError('api_token') }}</p>

              <div class="flex space-x-2">
                <button type="submit"
                        [disabled]="companyForm.invalid || creating"
                        class="flex-1 px-3 py-2 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
                        [title]="editingCompany ? 'Actualizar información de la empresa' : 'Crear nueva empresa'">
                  <mat-icon class="h-3 w-3" *ngIf="!creating">{{ editingCompany ? 'save' : 'add_business' }}</mat-icon>
                  <mat-icon class="h-3 w-3 animate-spin" *ngIf="creating">autorenew</mat-icon>
                  <span>{{ creating ? 'Guardando...' : (editingCompany ? 'Actualizar' : 'Crear') }}</span>
                </button>
                <button type="button"
                        *ngIf="editingCompany"
                        (click)="cancelEdit()"
                        class="px-3 py-2 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Búsqueda -->
        <div>
          <div class="relative">
            <input type="text"
                   [(ngModel)]="searchTerm"
                   (input)="filterCompanies()"
                   placeholder="Buscar empresas..."
                   class="block w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <mat-icon class="absolute left-2 top-2 h-4 w-4 text-gray-400">search</mat-icon>
          </div>
        </div>

        <!-- Lista de empresas -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-gray-900">
              Empresas ({{ filteredCompanies.length }})
            </h3>
            <div class="flex space-x-1">
              <button (click)="refreshCompanies()"
                      class="p-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      title="Actualizar lista">
                <mat-icon class="h-3 w-3">sync</mat-icon>
              </button>
              <button (click)="openCompaniesAdmin()"
                      class="p-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      title="Administrar empresas">
                <mat-icon class="h-3 w-3">settings</mat-icon>
              </button>
            </div>
          </div>

          <div *ngIf="loading" class="text-center py-3">
            <mat-icon class="h-5 w-5 animate-spin text-gray-400">refresh</mat-icon>
            <p class="text-xs text-gray-500 mt-1">Cargando...</p>
          </div>

          <div *ngIf="!loading && filteredCompanies.length === 0" class="text-center py-4 bg-gray-50 rounded-lg">
            <mat-icon class="h-6 w-6 text-gray-300 mx-auto mb-1">business_center</mat-icon>
            <p class="text-xs text-gray-500">{{ searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas' }}</p>
          </div>

          <div *ngIf="!loading && filteredCompanies.length > 0" class="space-y-1 max-h-48 overflow-y-auto">
            <div *ngFor="let company of filteredCompanies"
                 class="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <div class="h-6 w-6 bg-blue-100 rounded flex items-center justify-center">
                  <mat-icon class="h-3 w-3 text-blue-600">business</mat-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-900 truncate">{{ company.name }}</p>
                  <p class="text-xs text-gray-500">{{ company.documents_count || 0 }} doc(s)</p>
                </div>
              </div>

              <div class="flex space-x-1">
                <button (click)="selectCompany(company)"
                        class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
                        title="Seleccionar empresa">
                  <mat-icon class="h-3 w-3">check_circle</mat-icon>
                  <span>Usar</span>
                </button>
                <button (click)="editCompany(company)"
                        class="p-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                        title="Editar empresa">
                  <mat-icon class="h-3 w-3">edit</mat-icon>
                </button>
                <button (click)="deleteCompany(company)"
                        [disabled]="(company.documents_count || 0) > 0"
                        class="p-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        [title]="(company.documents_count || 0) > 0 ? 'No se puede eliminar: tiene documentos asociados' : 'Eliminar empresa'">
                  <mat-icon class="h-3 w-3">delete</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex items-center justify-end pt-2 border-t border-gray-200">
          <button (click)="onClose()"
                  class="px-3 py-2 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                  title="Cerrar ventana sin seleccionar">
            <mat-icon class="h-3 w-3">close</mat-icon>
            <span>Cerrar</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class CompanyQuickManagerComponent implements OnInit {
  companyForm!: FormGroup;
  companies: Company[] = [];
  filteredCompanies: Company[] = [];
  loading = false;
  creating = false;
  searchTerm = '';
  editingCompany: Company | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<CompanyQuickManagerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      api_token: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.loadCompanies();
  }

  private loadCompanies(): void {
    this.loading = true;
    // Cargar empresas reales desde el backend
    this.apiService.get<{ results: Company[] }>('/companies/').subscribe({
      next: (response) => {
        this.companies = response.results || [];
        this.filterCompanies();
        this.loading = false;
      },
      error: (error) => {
        console.log('Error loading companies from backend:', error);
        // Si no hay empresas, inicializar lista vacía
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

  onSubmitCompany(): void {
    if (this.companyForm.valid) {
      this.creating = true;
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
            this.creating = false;
          },
          error: (error) => {
            this.creating = false;
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
            this.creating = false;
            this.snackBar.open(`Empresa "${newCompany.name}" creada exitosamente`, 'Cerrar', { duration: 3000 });

            // Seleccionar automáticamente la empresa recién creada
            this.selectCompany(newCompany);
          },
          error: (error) => {
            this.creating = false;
            console.error('Error creating company:', error);
            this.snackBar.open('Error al crear la empresa. Intenta nuevamente.', 'Cerrar', { duration: 5000 });
          }
        });
      }
    }
  }

  editCompany(company: Company): void {
    this.editingCompany = company;
    this.companyForm.patchValue({
      name: company.name,
      api_token: (company as any).api_token || ''
    });
  }

  cancelEdit(): void {
    this.editingCompany = null;
    this.companyForm.reset();
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

  selectCompany(company: Company): void {
    this.dialogRef.close({ action: 'select', company });
  }

  refreshCompanies(): void {
    this.loadCompanies();
    this.snackBar.open('Lista actualizada', '', { duration: 2000 });
  }

  openCompaniesAdmin(): void {
    this.dialogRef.close({ action: 'admin_companies' });
  }



  onClose(): void {
    this.dialogRef.close();
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
