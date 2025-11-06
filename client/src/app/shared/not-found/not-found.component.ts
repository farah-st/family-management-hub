import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-not-found',
  imports: [RouterModule],
  template: `
    <section class="mx-auto max-w-lg p-8 text-center">
      <h1 class="text-3xl font-semibold mb-2">404</h1>
      <p class="text-gray-600 mb-6">That page could not be found.</p>
      <a routerLink="/" class="px-4 py-2 rounded-xl border">Go Home</a>
    </section>
  `,
})
export class NotFoundComponent {}
