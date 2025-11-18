//******************************************
//* Imports
//******************************************
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

import { ChoreService } from '../../services/chore.service';
import type { Chore } from '../../models/chore.model';

//******************************************
//* Metadata
//******************************************
@Component({
  selector: 'app-chore-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <form class="chore-form" [formGroup]="form" (ngSubmit)="save()">

      <h1 class="chore-form__title">
        {{ isEdit ? 'Edit' : 'New' }} Chore
      </h1>

      <!-- Title -->
      <label class="chore-form__field">
        <span class="chore-form__label">Title</span>
        <input
          class="chore-form__input"
          placeholder="Title"
          formControlName="title"
        />
        <span
          class="chore-form__error"
          *ngIf="form.get('title')?.touched && form.get('title')?.invalid"
        >
          Title is required
        </span>
      </label>

      <!-- Notes -->
      <label class="chore-form__field">
        <span class="chore-form__label">Notes</span>
        <textarea
          class="chore-form__input chore-form__input--textarea"
          placeholder="Notes"
          formControlName="notes"
          rows="3"
        ></textarea>
      </label>

      <!-- Priority -->
      <label class="chore-form__field">
        <span class="chore-form__label">Priority</span>
        <select class="chore-form__input" formControlName="priority">
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </select>
      </label>

      <!-- Due Date -->
      <label class="chore-form__field">
        <span class="chore-form__label">Due date (optional)</span>
        <input
          class="chore-form__input"
          type="date"
          formControlName="dueDate"
        />
      </label>

      <!-- Actions -->
      <div class="chore-form__actions">
        <button
          class="btn btn--primary"
          type="submit"
          [disabled]="form.invalid || loading"
        >
          {{ loading ? 'Saving...' : 'Save' }}
        </button>
        <button
          type="button"
          class="btn btn--ghost"
          (click)="cancel()"
        >
          Cancel
        </button>
      </div>

      <!-- Simple error message (optional improvement) -->
      <p class="chore-form__global-error" *ngIf="error">
        {{ error }}
      </p>
    </form>
  `,
  styleUrls: ['./chore-form.component.scss'],
})

//******************************************
//* Dependecies and state in the class
//******************************************
export class ChoreFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(ChoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Main reactive form
  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    notes: [''],
    priority: ['med'],
    dueDate: [''], // yyyy-MM-dd
  });

  // UI / state flags
  isEdit = false;
  loading = false;
  error: string | null = null;

  // Internal tracking
  private id: string | null = null;
  private justSaved = false; // used by the CanDeactivate guard

//******************************************
//* Loading existing chore in edit mode
//******************************************
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.id;

    if (this.isEdit && this.id) {
      this.loading = true;
      this.svc.getById(this.id).subscribe({
        next: (c) => {
          if (!c) return;
          this.form.patchValue(
            {
              title: c.title,
              notes: c.notes ?? '',
              priority: c.priority ?? 'med',
              // prefer backend dueDate; fall back to first assignment if needed
              dueDate:
                c.dueDate?.slice(0, 10) ??
                c.assignments?.[0]?.dueDate?.slice(0, 10) ??
                '',
            },
            { emitEvent: false }
          );
          this.form.markAsPristine();
        },
        error: () => {
          this.error = 'Unable to load chore details. Please try again.';
        },
        complete: () => {
          this.loading = false;
        },
      });
    }
  }

//******************************************
//* Create or update the chore
//******************************************
  save(): void {
    if (this.form.invalid || this.loading) return;

    this.error = null;
    this.loading = true;

    const dueDate: string | null = this.form.value.dueDate || null;

    // Base body for create/update
    const body: Partial<Chore> & { dueDate?: string | null } = {
      title: this.form.value.title!,
      notes: this.form.value.notes ?? '',
      priority: this.form.value.priority ?? 'med',
      dueDate,
    };

    // Only set assignments for NEW chores (optional improvement)
    if (!this.isEdit) {
      body.assignments = dueDate
        ? [{ memberId: 'unassigned', dueDate }]
        : [];
    }

    const req = this.isEdit && this.id
      ? this.svc.update(this.id, body)
      : this.svc.create(body);

    req.subscribe({
      next: () => {
        this.justSaved = true;
        this.form.markAsPristine();
        this.form.updateValueAndValidity({ emitEvent: false });
        this.router.navigate(['../'], { relativeTo: this.route });
      },
      error: () => {
        this.error = 'There was a problem saving this chore. Please try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

//******************************************
//* Backing out safely
//******************************************
  cancel(): void {
    // Mark as pristine so the guard doesn't prompt, then navigate away
    this.form.markAsPristine();
    this.router.navigate(['..'], { relativeTo: this.route });
  }

//******************************************
//* Hook for the CanDeactivate guard
//******************************************
  // Used by CanDeactivate guard
  isDirty(): boolean {
    return this.form.dirty && !this.justSaved;
  }
}

