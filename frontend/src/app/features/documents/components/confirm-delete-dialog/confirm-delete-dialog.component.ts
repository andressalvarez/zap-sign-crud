import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">warning</mat-icon>
      Confirmar eliminación
    </h2>
    <mat-dialog-content>
      <p>¿Estás seguro que deseas eliminar el documento <strong>"{{ data.documentName }}"</strong>?</p>
      <p class="warning-text">
        <mat-icon>info</mat-icon>
        Esta acción no se puede deshacer. El documento y todos sus firmantes serán eliminados.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">
        <mat-icon>cancel</mat-icon>
        Cancelar
      </button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">
        <mat-icon>delete</mat-icon>
        Eliminar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .warning-text {
      color: #f44336;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background-color: #ffeaa7;
      border-radius: 4px;
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { documentName: string }
  ) {}
}
