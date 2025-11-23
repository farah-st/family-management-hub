import { Component, inject, OnInit } from '@angular/core';
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
  styleUrls: ['./recipe-form.component.scss'],
})
export class RecipeFormComponent implements OnInit {
  // DI
  private route = inject(ActivatedRoute);
  private recipes = inject(RecipeService);
  private router = inject(Router);

  // State
  isEdit = false;
  selectedImageFile: File | null = null;

  // Keep id empty for new; server will assign a real id
  model: Recipe = {
    id: '',
    title: '',
    description: '',
    imageUrl: '',
    ingredients: [],
  };

  /* =========================
     Lifecycle
     ========================= */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      const found = this.recipes.get(id);
      if (found) {
        this.isEdit = true;
        // clone for form
        this.model = JSON.parse(JSON.stringify(found));
        if (!this.model.ingredients?.length) {
          this.model.ingredients = [{ name: '', qty: '' }];
        }
      }
    } else {
      // seed with a single empty ingredient row for UX
      this.model.ingredients = [{ name: '', qty: '' }];
    }
  }

  /* =========================
     Image upload
     ========================= */
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedImageFile = file;

    // Immediately upload and set the returned URL into model.imageUrl
    this.recipes.uploadImage(file).subscribe({
      next: (res) => {
        this.model.imageUrl = res.url;
        console.log('Image uploaded, URL:', res.url);
      },
      error: (err) => {
        console.error('Failed to upload image', err);
      },
    });
  }

  /* =========================
     Ingredient helpers
     ========================= */
  addIngredient(): void {
    this.model.ingredients.push({ name: '', qty: '' });
  }

  removeIngredient(i: number): void {
    this.model.ingredients.splice(i, 1);
  }

  /* =========================
     Submit
     ========================= */
  submit(): void {
    // Remove empty ingredient rows
    this.model.ingredients = (this.model.ingredients || []).filter(
      (ing) => (ing?.name?.trim()?.length || 0) > 0
    );

    // Basic guard: require a title
    if (!this.model.title?.trim()) return;

    if (this.isEdit) {
      this.recipes.update(this.model.id, this.model).subscribe((updated) => {
        this.router.navigate(['/recipes', updated.id]);
      });
    } else {
      // Do NOT send a client id; let the server create it
      const { id: _ignore, ...payload } =
        this.model as unknown as Omit<Recipe, 'id'> & { id?: string };

      this.recipes.create(payload as Recipe).subscribe((created) => {
        this.router.navigate(['/recipes', created.id]);
      });
    }
  }
}
