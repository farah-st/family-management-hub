import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { Recipe } from '../../models/recipe.model';
import { RecipeService } from '../../services/recipe.service';
import { GroceryListService } from '../../services/grocery-list.service';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './recipe-list.component.html',
  styleUrls: ['./recipe-list.component.scss']
})
export class RecipeListComponent {
  private recipeService = inject(RecipeService);
  private grocery = inject(GroceryListService);
  private router = inject(Router);

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

  trackById = (_: number, r: any) => r.id ?? r._id;

  addRecipeToGrocery(recipe: Recipe, ev?: Event) {
    ev?.stopPropagation();
    ev?.preventDefault();
    if (!this.hasNamedIngredients(recipe)) return;

    // Only add ingredients with a name (and keep qty if present)
    const items = (recipe.ingredients ?? []).filter(i => i?.name?.trim());
    if (!items.length) return;

    this.grocery.addMany(items);
    this.router.navigate(['/grocery-list']);
  }

  confirmRemove(recipe: Recipe, ev?: Event) {
  ev?.stopPropagation();
  ev?.preventDefault();
  if (!recipe?.id) return;

  const ok = confirm(`Remove "${recipe.title}"? This cannot be undone.`);
  if (!ok) return;

  this.recipeService.remove(recipe.id).subscribe({
    next: () => { /* cache already updated in service */ },
    error: (err) => {
      console.error('Delete failed', err);
      alert('Delete failed. See console for details.');
    }
  });
}

}

