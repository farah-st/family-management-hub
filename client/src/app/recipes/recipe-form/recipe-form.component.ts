import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';

function newId() { return Date.now().toString(36); }

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
      this.model.id = newId();
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
    if (this.isEdit) this.recipes.update(this.model.id, this.model);
    else this.recipes.create(this.model);
    this.router.navigate(['/recipes', this.model.id]);
  }

}
