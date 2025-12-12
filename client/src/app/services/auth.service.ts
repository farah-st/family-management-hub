import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: string;
  username: string; // ✅ NEW
  name?: string;
  email?: string;
  role: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  private userSubject = new BehaviorSubject<AuthUser | null>(this.loadUser());
  user$ = this.userSubject.asObservable();

  isLoggedIn$ = this.user$.pipe(map((user) => !!user));

  private loadUser(): AuthUser | null {
    return JSON.parse(localStorage.getItem('fmh_user') ?? 'null');
  }

  /** Log in with email + password (unchanged for now) */
  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('fmh_user', JSON.stringify(res.user));
          this.userSubject.next(res.user);
        })
      );
  }

  /** Register a new account and auto-login (now includes username) */
  register(data: { username: string; name: string; email: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${this.base}/register`, data)
      .pipe(
        tap((res) => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('fmh_user', JSON.stringify(res.user));
          this.userSubject.next(res.user);
        })
      );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('fmh_user');
    this.userSubject.next(null);
  }
}
