import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialog, boolean>);
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);

  protected close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
