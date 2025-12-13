import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

const KEY = 'fmh_profile_v1';

type Profile = {
  name: string;
  email: string;
  role: string; // mom/dad/child/etc
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  savedMessage = '';
  errorMessage = '';

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['mom', [Validators.required]],
  });

  constructor(private fb: FormBuilder) {
    const existing = this.load();
    if (existing) this.form.patchValue(existing);
  }

  save(): void {
    this.savedMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fix the errors before saving.';
      return;
    }

    const profile: Profile = {
      name: String(this.form.value.name ?? '').trim(),
      email: String(this.form.value.email ?? '').trim(),
      role: String(this.form.value.role ?? 'mom').trim(),
    };

    localStorage.setItem(KEY, JSON.stringify(profile));
    this.savedMessage = 'Saved!';
    setTimeout(() => (this.savedMessage = ''), 1500);
  }

  reset(): void {
    localStorage.removeItem(KEY);
    this.form.reset({ name: '', email: '', role: 'mom' });
    this.savedMessage = '';
    this.errorMessage = '';
  }

  private load(): Profile | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Profile;
    } catch {
      return null;
    }
  }

  get f() {
    return this.form.controls;
  }
}
