import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ChoreService } from '../../services/chore.service';
import type { Chore } from '../../models/chore.model';

//******************************************
//* Component metadata
//******************************************
@Component({
  selector: 'app-chore-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mx-auto max-w-3xl p-4">
      <header class="flex items-center gap-2 mb-4">
        <h1 class="text-2xl font-semibold">Chores</h1>
        <a
          class="ml-auto px-3 py-2 rounded-xl bg-black text-white"
          routerLink="new"
        >
          + New
        </a>
      </header>

      <ng-container *ngIf="vm$ | async as vm; else loading">
        <ng-container *ngIf="vm.length; else empty">
          <ul class="grid gap-2">
            <li
              *ngFor="let c of vm; trackBy: trackById"
              class="p-3 rounded-xl border flex items-center gap-3"
            >
              <!-- Complete button -->
              <button
                type="button"
                (click)="complete(c)"
                class="px-2 py-1 rounded-lg border text-xs"
              >
                Done
              </button>

              <!-- Title links to edit -->
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

              <!-- Priority -->
              <span class="ml-auto text-xs opacity-70">
                {{ c.priority }}
              </span>

              <!-- Delete button -->
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
        <div class="loading-state animate-pulse">
          Loading chores…
        </div>
      </ng-template>

      <ng-template #empty>
        <div class="empty-state">
          <p class="mb-3">No chores yet.</p>
          <a routerLink="new">Create your first chore</a>
        </div>
      </ng-template>

    </div>
  `,
   styleUrls: ['./chore-list.component.scss']
}
)
export class ChoreListComponent {
  private svc = inject(ChoreService);

  // Observable list of chores for the template's async pipe
  vm$ = this.svc.list();

  /** Mark a chore as complete */
  complete(c: Chore): void {
    this.svc.complete(c.id).subscribe({
      error: () => {
        // optional: show a toast or console log
        console.error('Failed to complete chore', c.id);
      }
    });
  }

  /** Prefer top-level dueDate; fall back to first assignment's dueDate */
  firstDueDate(c: Chore): string | null {
    return c.dueDate ?? c.assignments?.[0]?.dueDate ?? null;
  }

  /** Delete a chore after confirmation */
  remove(c: Chore): void {
    if (!confirm(`Delete "${c.title}"?`)) return;
    this.svc.remove(c.id).subscribe({
      error: () => {
        console.error('Failed to delete chore', c.id);
      }
    });
  }

  /** TrackBy function to avoid re-rendering whole list unnecessarily */
  trackById = (_: number, c: Chore): string => c.id;
}

