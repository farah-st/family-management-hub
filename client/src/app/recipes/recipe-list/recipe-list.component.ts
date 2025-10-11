import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map/*, startWith*/ } from 'rxjs';
import { Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './recipe-list.component.html',
  styleUrls: ['./recipe-list.component.scss']
})
export class RecipeListComponent {
  private recipeService = inject(RecipeService);

  // If your service emits immediately, startWith([]) isn't necessary.
  // recipes$ = this.recipeService.list().pipe(startWith<Recipe[]>([]));
  recipes$ = this.recipeService.list();

  query = '';
  private readonly query$ = new BehaviorSubject<string>('');

  onQueryChange(v: string) {
    this.query = v ?? '';
    this.query$.next(this.query);
  }

  filteredRecipes$ = combineLatest([this.recipes$, this.query$]).pipe(
    map(([recipes, q]) => {
      const s = (q ?? '').toLowerCase().trim();

      // Keep only recipes with a title and at least one named ingredient
      const validRecipes = (recipes ?? []).filter(
        r => r?.title?.trim() &&
             r?.ingredients?.some(i => i?.name?.trim())
      );

      if (!s) return validRecipes;

      return validRecipes.filter(r =>
        r.title.toLowerCase().includes(s) ||
        r.ingredients?.some(i => (i?.name?.trim()?.toLowerCase() ?? '').includes(s))
      );
    })
  );

  hasNamedIngredients(recipe: Recipe): boolean {
    return Array.isArray(recipe.ingredients) &&
           recipe.ingredients.some(i => !!i?.name?.trim());
  }

  trackById = (_: number, r: Recipe) => r.id;

  confirmRemove(recipe: Recipe, ev?: Event) {
    ev?.stopPropagation();
    ev?.preventDefault();
    if (!recipe?.id) return;

    const ok = confirm(`Remove "${recipe.title}"? This cannot be undone.`);
    if (ok) this.recipeService.remove(recipe.id);
  }
}
