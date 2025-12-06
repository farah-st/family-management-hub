import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  private userSubject = new BehaviorSubject<any>(this.loadUser());
  user$ = this.userSubject.asObservable();

  private loadUser() {
    return JSON.parse(localStorage.getItem("fmh_user") ?? "null");
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${this.base}/login`, { username, password })
      .pipe(
        tap(res => {
          localStorage.setItem("token", res.token);
          localStorage.setItem("fmh_user", JSON.stringify(res.user));
          this.userSubject.next(res.user);
        })
      );
  }

  register(data: any) {
    return this.http.post(`${this.base}/register`, data);
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("fmh_user");
    this.userSubject.next(null);
  }
}
