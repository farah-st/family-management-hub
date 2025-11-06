import { Routes, CanDeactivateFn, ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { of } from 'rxjs';

import { RecipeService } from './services/recipe.service';
import type { Recipe } from './models/recipe.model'; // adjust the path if needed

// ---------- Resolver for recipe :id ----------
const recipeResolver: ResolveFn<Recipe | null> = (route) => {
  const svc = inject(RecipeService);
  const id = route.paramMap.get('id');
  if (!id) return of(null);
  return svc.getById(id); // implemented in step 2
};

// ---------- Unsaved-changes guard ----------
type DirtyAware =
  | { isDirty?: () => boolean; form?: { dirty?: boolean } }
  | undefined;

const confirmLeaveForm: CanDeactivateFn<DirtyAware> = (cmp) => {
  const dirty = Boolean(cmp?.isDirty?.() ?? cmp?.form?.dirty);
  return dirty ? confirm('You have unsaved changes. Leave this page?') : true;
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'recipes' },

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

  {
    path: 'grocery-list',
    title: 'Grocery List',
    loadComponent: () =>
      import('./grocery/grocery-list/grocery-list.component')
        .then(m => m.GroceryListComponent),
  },

  {
    path: '**',
    title: 'Not Found',
    loadComponent: () =>
      import('./shared/not-found/not-found.component')
        .then(m => m.NotFoundComponent),
  },
];

