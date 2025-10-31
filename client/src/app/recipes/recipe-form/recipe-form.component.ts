import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recipe-form.component.html',
  styleUrls: ['./recipe-form.component.scss']
})
export class RecipeFormComponent {
  private route = inject(ActivatedRoute);
  private recipes = inject(RecipeService);
  private router = inject(Router);

  isEdit = false;
  // Keep id empty for new; server will assign a real id
  model: Recipe = { id: '', title: '', description: '', imageUrl: '', ingredients: [] };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const found = this.recipes.get(id);
      if (found) {
        this.isEdit = true;
        this.model = JSON.parse(JSON.stringify(found)); // clone for form
      }
    } else {
      // seed with a single empty ingredient row for UX
      this.model.ingredients = [{ name: '', qty: '' }];
    }
  }

  addIngredient() { this.model.ingredients.push({ name: '', qty: '' }); }
  removeIngredient(i: number) { this.model.ingredients.splice(i, 1); }

  submit() {
    // Remove empty ingredient rows
    this.model.ingredients = (this.model.ingredients || []).filter(
      ing => (ing?.name?.trim()?.length || 0) > 0
    );
    // Basic guard: require a title
    if (!this.model.title?.trim()) return;

    if (this.isEdit) {
      // We'll make update(...) return an Observable<Recipe> in the next step
      this.recipes.update(this.model.id, this.model).subscribe((updated) => {
        this.router.navigate(['/recipes', updated.id]);
      });
    } else {
      // Do NOT send a client id; let the server create it
      const { id: _ignore, ...payload } = this.model as unknown as Omit<Recipe, 'id'> & { id?: string };
      // We'll make create(...) return Observable<Recipe> in the next step
      this.recipes.create(payload as Recipe).subscribe((created) => {
        this.router.navigate(['/recipes', created.id]);
      });
    }
  }
}