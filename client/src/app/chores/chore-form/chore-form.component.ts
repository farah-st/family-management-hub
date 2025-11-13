import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

import { ChoreService } from '../../services/chore.service';
import type { Chore } from '../../models/chore.model';

@Component({
  selector: 'app-chore-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
  <form class="mx-auto max-w-xl p-4 grid gap-4" [formGroup]="form" (ngSubmit)="save()">
    <h1 class="text-2xl font-semibold">{{ isEdit ? 'Edit' : 'New' }} Chore</h1>

    <label class="grid gap-1">
      <span class="text-sm font-medium">Title</span>
      <input class="border rounded-lg p-2" placeholder="Title" formControlName="title">
      <span class="text-xs text-red-600" *ngIf="form.get('title')?.touched && form.get('title')?.invalid">
        Title is required
      </span>
    </label>

    <label class="grid gap-1">
      <span class="text-sm font-medium">Notes</span>
      <textarea class="border rounded-lg p-2" placeholder="Notes" formControlName="notes"></textarea>
    </label>

    <label class="grid gap-1">
      <span class="text-sm font-medium">Priority</span>
      <select class="border rounded-lg p-2" formControlName="priority">
        <option value="low">Low</option>
        <option value="med">Medium</option>
        <option value="high">High</option>
      </select>
    </label>

    <label class="grid gap-1">
      <span class="text-sm font-medium">Due date (optional)</span>
      <input class="border rounded-lg p-2" type="date" formControlName="dueDate">
    </label>

    <div class="flex gap-2">
      <button class="px-4 py-2 rounded-xl bg-black text-white" type="submit" [disabled]="form.invalid">
        Save
      </button>
      <button type="button" class="px-4 py-2 rounded-xl border" (click)="cancel()">
        Cancel
      </button>
    </div>
  </form>
  `
})
export class ChoreFormComponent {
  private fb = inject(FormBuilder);
  private svc = inject(ChoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    notes: [''],
    priority: ['med'],
    dueDate: [''] // yyyy-MM-dd
  });

  isEdit = false;
  private id: string | null = null;
  private justSaved = false; // used by the guard

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.id;

      if (this.isEdit && this.id) {
      this.svc.getById(this.id).subscribe(c => {
        if (!c) return;
        this.form.patchValue({
          title: c.title,
          notes: c.notes ?? '',
          priority: c.priority ?? 'med',
          // prefer backend dueDate; fall back to first assignment if needed
          dueDate:
            c.dueDate?.slice(0, 10) ??
            c.assignments?.[0]?.dueDate?.slice(0, 10) ??
            ''
        }, { emitEvent: false });
        this.form.markAsPristine();
      });
    }
  }

  save() {
    if (this.form.invalid) return;

    const dueDate: string | null = this.form.value.dueDate || null;

    const body: Partial<Chore> & { dueDate?: string | null } = {
      title: this.form.value.title!,
      notes: this.form.value.notes ?? '',
      priority: this.form.value.priority ?? 'med',

      // send top-level dueDate to match backend
      dueDate,

      // keep your assignments idea in sync with that date
      assignments: dueDate
        ? [{ memberId: 'unassigned', dueDate }]
        : []
    };

    const req = this.isEdit && this.id
      ? this.svc.update(this.id, body)
      : this.svc.create(body);

    req.subscribe({
      next: () => {
        this.justSaved = true;
        this.form.markAsPristine();
        this.form.updateValueAndValidity({ emitEvent: false });
        this.router.navigate(['../'], { relativeTo: this.route });
      }
    });
  }


  cancel() {
    // reset form and navigate away safely
    this.form.reset(this.form.getRawValue());
    this.form.markAsPristine();
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  // Used by CanDeactivate guard
  isDirty(): boolean {
    return this.form.dirty && !this.justSaved;
  }
}
