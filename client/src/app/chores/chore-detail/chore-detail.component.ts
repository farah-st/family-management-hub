import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { ChoreService } from '../../services/chore.service';
import type { Chore } from '../../models/chore.model';

@Component({
  selector: 'app-chore-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chore-detail.component.html',
  styleUrl: './chore-detail.component.scss',
})
export class ChoreDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ChoreService);

  // Automatically load the chore using its ID from the route
  chore$ = this.route.paramMap.pipe(
    switchMap(params => {
      const id = params.get('id')!;
      return this.svc.get(id);
    })
  );

  delete(c: Chore) {
    if (!confirm(`Delete "${c.title}"?`)) return;

    this.svc.remove(c.id).subscribe({
      next: () => this.router.navigate(['/chores']),
      error: () => alert('Failed to delete chore.')
    });
  }
}

