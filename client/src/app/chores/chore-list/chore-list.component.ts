import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';

import { ChoreService } from '../../services/chore.service';
import type { Chore } from '../../models/chore.model';

interface MemberTotals {
  mom: number;
  dad: number;
  daughter: number;
  son: number;
}

@Component({
  selector: 'app-chore-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './chore-list.component.html',
  styleUrls: ['./chore-list.component.scss'],
})
export class ChoreListComponent {
  private svc = inject(ChoreService);

  vm$ = this.svc.list();

  // which chore is currently choosing a member for completion
  selectingForId: string | null = null;

  // simple set of members we support
  readonly members = [
    { id: 'mom', label: 'Mom' },
    { id: 'dad', label: 'Dad' },
    { id: 'daughter', label: 'Daughter' },
    { id: 'son', label: 'Son' },
  ];

  // totals per member, computed from chores + completed entries
  totals$ = this.vm$.pipe(
    map((chores): MemberTotals => {
      const totals: MemberTotals = {
        mom: 0,
        dad: 0,
        daughter: 0,
        son: 0,
      };

      for (const chore of chores) {
        const reward = chore.rewardAmount ?? 0;
        if (!reward) continue;

        for (const entry of chore.completed ?? []) {
          const m = entry.memberId as keyof MemberTotals | undefined;
          if (m && totals[m] !== undefined) {
            totals[m] += reward;
          }
        }
      }

      return totals;
    })
  );

  // Called when user first clicks "Done"
  startComplete(c: Chore): void {
    this.selectingForId = this.selectingForId === c.id ? null : c.id;
  }

  // Called when user picks a member ("Mom", "Dad", etc.)
  complete(c: Chore, memberId: string): void {
    this.svc.complete(c.id, memberId).subscribe({
      next: () => {
        this.selectingForId = null;
      },
      error: () => console.error('Failed to complete chore', c.id),
    });
  }

  firstDueDate(c: Chore): string | null {
    return c.dueDate ?? c.assignments?.[0]?.dueDate ?? null;
  }

  remove(c: Chore): void {
    if (!confirm(`Delete "${c.title}"?`)) return;
    this.svc.remove(c.id).subscribe({
      error: () => console.error('Failed to delete chore', c.id),
    });
  }

  trackById = (_: number, c: Chore): string => c.id;
}
