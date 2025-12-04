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
  templateUrl: './chore-form.component.html',
  styleUrls: ['./chore-form.component.scss'],
})

//******************************************
//* Dependencies and state in the class
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

    // NEW: reward fields
    rewardAmount: [0],
    rewardCurrency: ['USD'],

    // NEW: assignedTo nested group
    assignedTo: this.fb.group({
      name: [''],
      role: [''],
    }),
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

              // NEW: reward fields
              rewardAmount: c.rewardAmount ?? 0,
              rewardCurrency: c.rewardCurrency ?? 'USD',

              // NEW: assignedTo
              assignedTo: {
                name: c.assignedTo?.name ?? '',
                role: c.assignedTo?.role ?? '',
              },
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

    const value = this.form.value as any;
    const dueDate: string | null = value.dueDate || null;

    const body: Partial<Chore> & { dueDate?: string | null } = {
      title: value.title!,
      notes: value.notes ?? '',
      priority: value.priority ?? 'med',
      dueDate,

      // NEW: reward fields
      rewardAmount: value.rewardAmount ?? 0,
      rewardCurrency: value.rewardCurrency ?? 'USD',
    };

    // NEW: only send assignedTo if at least name or role is filled
    const name = value.assignedTo?.name?.trim?.();
    const role = value.assignedTo?.role?.trim?.();
    if (name || role) {
      body.assignedTo = {
        name: name ?? '',
        role: role ?? '',
      } as any;
    }

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