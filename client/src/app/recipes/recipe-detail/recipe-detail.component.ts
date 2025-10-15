import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { GroceryListService } from '../../services/grocery-list.service';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss']
})
export class RecipeDetailComponent {
  private route = inject(ActivatedRoute);
  private recipes = inject(RecipeService);
  private grocery = inject(GroceryListService);
  private router = inject(Router);

  recipe?: Recipe;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.recipe = this.recipes.get(id);
  }

  addToGrocery() {
    if (this.recipe?.ingredients?.length) {
      this.grocery.addMany(this.recipe.ingredients);
      this.router.navigate(['/grocery-list']);
    }
  }
}
