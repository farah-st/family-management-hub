import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

// 🔽 Apollo imports
import { APOLLO_OPTIONS, Apollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { environment } from './environments/environment';

// ./app/core/auth.interceptor

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),

    // Keep your existing HttpClient with auth interceptor
    provideHttpClient(withInterceptors([authInterceptor])),

    // 🔽 Make Apollo & HttpLink injectable
    Apollo,
    HttpLink,

    // 🔽 Apollo client configuration
    {
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink) => {
        // environment.apiUrl is probably like "http://localhost:4000/api"
        // Strip trailing "/api" and point to "/graphql"
        const uri = environment.apiUrl.replace(/\/api\/?$/, '') + '/graphql';

        return {
          cache: new InMemoryCache(),
          link: httpLink.create({ uri }),
        };
      },
      deps: [HttpLink],
    },
  ],
}).catch((err) => console.error(err));
