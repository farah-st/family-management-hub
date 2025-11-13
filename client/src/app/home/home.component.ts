import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';

import { RecipeService } from '../services/recipe.service';
import { ChoreService } from '../services/chore.service';
import type { Recipe } from '../models/recipe.model';
import type { Chore } from '../models/chore.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mx-auto max-w-5xl p-4 space-y-6">
      <header class="flex items-center gap-2 mb-2">
        <h1 class="text-3xl font-semibold">Family Management Hub</h1>
        <span class="ml-auto text-sm opacity-70">Dashboard</span>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <!-- Chores summary -->
        <section class="p-4 rounded-2xl border space-y-3">
          <header class="flex items-center gap-2">
            <h2 class="text-lg font-semibold">Chores</h2>
            <a routerLink="/chores" class="ml-auto text-sm underline">
              View all
            </a>
          </header>

          <ng-container *ngIf="chores$ | async as chores; else choresLoading">
            <ng-container *ngIf="chores.length; else choresEmpty">
              <ul class="space-y-1">
                <li
                  *ngFor="let c of chores"
                  class="flex items-center gap-2 text-sm"
                >
                  <span
                    class="inline-flex h-2 w-2 rounded-full"
                    [class.bg-green-500]="c.completed?.length"
                    [class.bg-slate-300]="!c.completed?.length"
                  ></span>

                  <a
                    [routerLink]="['/chores', c.id]"
                    class="truncate hover:underline"
                  >
                    {{ c.title }}
                  </a>

                  <span class="ml-auto text-xs opacity-70">
                    {{ c.priority }}
                  </span>
                </li>
              </ul>
            </ng-container>
          </ng-container>

          <ng-template #choresLoading>
            <p class="text-sm opacity-70">Loading chores…</p>
          </ng-template>

          <ng-template #choresEmpty>
            <p class="text-sm opacity-70 mb-2">
              No chores yet. Start by adding one!
            </p>
            <a
              routerLink="/chores/new"
              class="inline-block px-3 py-1 rounded-xl border text-sm"
            >
              + New chore
            </a>
          </ng-template>
        </section>

        <!-- Recipes summary -->
        <section class="p-4 rounded-2xl border space-y-3">
          <header class="flex items-center gap-2">
            <h2 class="text-lg font-semibold">Recipes</h2>
            <a routerLink="/recipes" class="ml-auto text-sm underline">
              View all
            </a>
          </header>

          <ng-container *ngIf="recipes$ | async as recipes; else recipesLoading">
            <ng-container *ngIf="recipes.length; else recipesEmpty">
              <ul class="space-y-1">
                <li
                  *ngFor="let r of recipes"
                  class="flex items-center gap-2 text-sm"
                >
                  <a
                    [routerLink]="['/recipes', r.id]"
                    class="truncate hover:underline"
                  >
                    {{ r.title }}
                  </a>
                </li>
              </ul>
            </ng-container>
          </ng-container>

          <ng-template #recipesLoading>
            <p class="text-sm opacity-70">Loading recipes…</p>
          </ng-template>

          <ng-template #recipesEmpty>
            <p class="text-sm opacity-70 mb-2">
              No recipes yet. Add your first one!
            </p>
            <a
              routerLink="/recipes/new"
              class="inline-block px-3 py-1 rounded-xl border text-sm"
            >
              + New recipe
            </a>
          </ng-template>
        </section>
      </div>
    </div>
  `,
})
export class HomeComponent {
  private recipeSvc = inject(RecipeService);
  private choreSvc = inject(ChoreService);

  // show just a few on the dashboard
  recipes$ = this.recipeSvc.list().pipe(
    map((xs: Recipe[]) => xs.slice(0, 5))
  );

  chores$ = this.choreSvc.list().pipe(
    map((xs: Chore[]) => xs.slice(0, 5))
  );
}
