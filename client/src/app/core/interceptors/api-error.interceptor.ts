// src/app/core/interceptors/api-error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
// Optional: import a toast/logger lazily to avoid DI in fn interceptors
// import { inject } from '@angular/core';
// import { ToastService } from '../../shared/toast.service';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  // const toast = inject(ToastService); // if you have one
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // toast?.error(err.error?.message ?? `Request failed (${err.status})`);
      console.error('API error:', err.status, err.message, err.error);
      return throwError(() => err);
    })
  );
};

