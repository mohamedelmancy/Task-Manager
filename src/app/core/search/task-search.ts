import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TaskSearch {
  readonly query = signal('');
}
