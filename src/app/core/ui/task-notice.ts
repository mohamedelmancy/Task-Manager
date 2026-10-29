import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TaskNotice {
  private readonly pending = signal({ id: 0, key: '' });
  private shownId = 0;

  show(messageKey: string): void {
    this.pending.update((current) => ({ id: current.id + 1, key: messageKey }));
  }

  consume(): string {
    const notice = this.pending();
    if (notice.key === '' || notice.id === this.shownId) {
      return '';
    }

    this.shownId = notice.id;
    return notice.key;
  }
}
