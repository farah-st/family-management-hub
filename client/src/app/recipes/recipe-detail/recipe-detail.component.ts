import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, map, Subscription } from 'rxjs';
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
export class RecipeDetailComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private recipes = inject(RecipeService);
  private grocery = inject(GroceryListService);
  private router = inject(Router);

  private sub?: Subscription;
  recipe?: Recipe;

  ngOnInit() {
    const id$ = this.route.paramMap.pipe(map(pm => pm.get('id')!));

    this.sub = combineLatest([id$, this.recipes.list()]).pipe(
      map(([id, list]) => list.find(r => r.id === id))
    ).subscribe(r => {
      this.recipe = r; // updates when the cache populates after server fetch
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  addToGrocery() {
    if (this.recipe?.ingredients?.length) {
      this.grocery.addMany(this.recipe.ingredients);
      this.router.navigate(['/grocery-list']);
    }
  }
}
