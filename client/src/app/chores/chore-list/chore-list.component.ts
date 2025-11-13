import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ChoreService } from '../../services/chore.service';
import type { Chore } from '../../models/chore.model';

@Component({
  selector: 'app-chore-list',
  standalone: true,
  // IMPORTANT: these must be the actual imported identifiers
  imports: [CommonModule, RouterModule],
  template: `
  <div class="mx-auto max-w-3xl p-4">
    <header class="flex items-center gap-2 mb-4">
      <h1 class="text-2xl font-semibold">Chores</h1>
      <a class="ml-auto px-3 py-2 rounded-xl bg-black text-white" routerLink="new">+ New</a>
    </header>

    <ng-container *ngIf="vm$ | async as vm; else loading">
      <ng-container *ngIf="vm.length; else empty">
        <ul class="grid gap-2">
          <li
            *ngFor="let c of vm; trackBy: trackById"
            class="p-3 rounded-xl border flex items-center gap-3"
          >
            <button
              (click)="complete(c)"
              class="px-2 py-1 rounded-lg border text-xs"
            >
              Done
            </button>

            <a [routerLink]="[c.id]" class="font-medium">
              {{ c.title }}
            </a>

            <!-- Due date -->
            <span
              *ngIf="firstDueDate(c) as due"
              class="ml-2 text-xs text-slate-500"
            >
              Due {{ due | date: 'MMM d' }}
            </span>

            <span class="ml-auto text-xs opacity-70">
              {{ c.priority }}
            </span>

            <button
              type="button"
              class="ml-2 px-2 py-1 rounded-lg border text-xs text-red-600"
              (click)="remove(c)"
            >
              Delete
            </button>
          </li>
        </ul>
      </ng-container>
    </ng-container>

    <ng-template #loading>
      <div class="animate-pulse p-3 rounded-xl border">Loading chores…</div>
    </ng-template>

    <ng-template #empty>
      <div class="text-center p-6 rounded-xl border">
        <p class="mb-3">No chores yet.</p>
        <a routerLink="new" class="px-3 py-2 rounded-xl border">Create your first chore</a>
      </div>
    </ng-template>
  </div>
`

})

export class ChoreListComponent {
  private svc = inject(ChoreService);
  vm$ = this.svc.list();

  complete(c: Chore) {
    this.svc.complete(c.id).subscribe();
  }

  firstDueDate(c: Chore): string | null {
  // prefer the backend's dueDate, fall back to first assignment
  return c.dueDate ?? c.assignments?.[0]?.dueDate ?? null;
  }

  // New: delete a chore
  remove(c: Chore) {
    if (!confirm(`Delete "${c.title}"?`)) return;
    this.svc.remove(c.id).subscribe();
  }

  trackById = (_: number, c: Chore) => c.id;
}
