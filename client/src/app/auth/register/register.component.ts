import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error: string | null = null;

  form = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() {
    return this.form.controls;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const { name, email, password } = this.form.value;

    this.auth
      .register({ name: name!, email: email!, password: password! })
      .subscribe({
        next: () => {
          this.loading = false;
          // After registering, send them home or to login
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          console.error('Register failed', err);
          this.loading = false;
          this.error =
            err?.error?.message ||
            'Registration failed. Please try a different email.';
        },
      });
  }
}
