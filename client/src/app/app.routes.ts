import { Routes, CanDeactivateFn, ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { of } from 'rxjs';

import { RecipeService } from './services/recipe.service';
import type { Recipe } from './models/recipe.model';
import { WeeklyPlanComponent } from './meal-plan/weekly-plan/weekly-plan.component';

/* =========================
   RESOLVERS
   ========================= */
const recipeResolver: ResolveFn<Recipe | null> = (route) => {
  const svc = inject(RecipeService);
  const id = route.paramMap.get('id');
  if (!id) return of(null);
  return svc.getById(id);
};

/* =========================
   GUARDS
   ========================= */
type DirtyAware =
  | { isDirty?: () => boolean; form?: { dirty?: boolean } }
  | undefined;

const confirmLeaveForm: CanDeactivateFn<DirtyAware> = (cmp) => {
  const dirty = Boolean(cmp?.isDirty?.() ?? cmp?.form?.dirty);
  return dirty ? confirm('You have unsaved changes. Leave this page?') : true;
};

/* =========================
   ROUTES
   ========================= */
  export const routes: Routes = [
  /* ---------- Root landing page ---------- */
  {
    path: '',
    pathMatch: 'full',
    title: 'Family Hub',
    loadComponent: () =>
      import('./home/home.component')
        .then(m => m.HomeComponent),
  },


  /* ---------- Legacy redirects ---------- */
  // /chore → /chores (singular → plural)
  { path: 'chore', redirectTo: 'chores', pathMatch: 'full' },

  /* ---------- Recipes feature ---------- */
  {
    path: 'recipes',
    title: 'Recipes',
    children: [
      {
        path: '',
        title: 'Recipes',
        loadComponent: () =>
          import('./recipes/recipe-list/recipe-list.component')
            .then(m => m.RecipeListComponent),
      },
      {
        path: 'new',
        title: 'New Recipe',
        loadComponent: () =>
          import('./recipes/recipe-form/recipe-form.component')
            .then(m => m.RecipeFormComponent),
        canDeactivate: [confirmLeaveForm],
      },
      {
        path: ':id',
        title: 'Recipe Details',
        loadComponent: () =>
          import('./recipes/recipe-detail/recipe-detail.component')
            .then(m => m.RecipeDetailComponent),
        resolve: { recipe: recipeResolver },
      },
      {
        path: ':id/edit',
        title: 'Edit Recipe',
        loadComponent: () =>
          import('./recipes/recipe-form/recipe-form.component')
            .then(m => m.RecipeFormComponent),
        resolve: { recipe: recipeResolver },
        canDeactivate: [confirmLeaveForm],
      },
    ],
  },

  /* ---------- Grocery feature ---------- */
  {
    path: 'grocery-list',
    title: 'Grocery List',
    loadComponent: () =>
      import('./grocery/grocery-list/grocery-list.component')
        .then(m => m.GroceryListComponent),
  },

  /* ---------- Chores feature ---------- */
  {
    path: 'chores',
    title: 'Chores',
    children: [
      {
        path: '',
        title: 'Chores',
        loadComponent: () =>
          import('./chores/chore-list/chore-list.component')
            .then(m => m.ChoreListComponent),
      },
      {
        path: 'new',
        title: 'New Chore',
        loadComponent: () =>
          import('./chores/chore-form/chore-form.component')
            .then(m => m.ChoreFormComponent),
        canDeactivate: [confirmLeaveForm],
      },
      {
        // Edit uses the same form as create
        path: ':id',
        title: 'Edit Chore',
        loadComponent: () =>
          import('./chores/chore-form/chore-form.component')
            .then(m => m.ChoreFormComponent),
        canDeactivate: [confirmLeaveForm],
      },
    ],
  },

  /* ---------- Weekly plan feature ---------- */
  {
  path: 'meal-plan',
  loadComponent: () =>
    import('./meal-plan/weekly-plan/weekly-plan.component').then(
      (m) => m.WeeklyPlanComponent
    ),
},

  /* ---------- 404 (always last) ---------- */
  {
    path: '**',
    title: 'Not Found',
    loadComponent: () =>
      import('./shared/not-found/not-found.component')
        .then(m => m.NotFoundComponent),
  },
  { 
    path: 'meal-plan', component: WeeklyPlanComponent 
  },
];
