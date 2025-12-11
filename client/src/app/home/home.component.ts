import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';

import { RecipeService } from '../services/recipe.service';
import { ChoreService } from '../services/chore.service';
import type { Recipe } from '../models/recipe.model';
import type { Chore } from '../models/chore.model';
import { AuthService } from '../services/auth.service';
import { WeeklyPlanComponent } from '../meal-plan/weekly-plan/weekly-plan.component';


import { LoginComponent } from '../auth/login/login.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoginComponent,
    WeeklyPlanComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private recipeSvc = inject(RecipeService);
  private choreSvc = inject(ChoreService);
  private auth = inject(AuthService);

  recipes$ = this.recipeSvc.list().pipe(
    map((xs: Recipe[]) => xs.slice(0, 5))
  );

  chores$ = this.choreSvc.list().pipe(
    map((xs: Chore[]) => xs.slice(0, 5))
  );

  isLoggedIn$ = this.auth.isLoggedIn$;

  logout(): void {
    this.auth.logout();
  }
}
