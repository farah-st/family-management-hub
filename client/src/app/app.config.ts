import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withPreloading } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PreloadAllModules } from '@angular/router';

/** Example interceptors (implement these in ./core/interceptors/...) */
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';

/** Optional: global error handler */
class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    // TODO: route to a toast/logger service
    console.error('Global error:', error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({
      eventCoalescing: true,
      runCoalescing: true
    }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, apiErrorInterceptor])
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
};

