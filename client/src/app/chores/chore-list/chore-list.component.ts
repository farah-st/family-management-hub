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
  templateUrl: './chore-list.component.html',
  styleUrls: ['./chore-list.component.scss'],
})
export class ChoreListComponent {
  private svc = inject(ChoreService);

  vm$ = this.svc.list();

  complete(c: Chore): void {
    this.svc.complete(c.id).subscribe({
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


