import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';

import { RecipeService } from '../services/recipe.service';
import { ChoreService } from '../services/chore.service';
import type { Recipe } from '../models/recipe.model';
import type { Chore } from '../models/chore.model';
import { AuthService } from '../services/auth.service';

import { LoginComponent } from '../auth/login/login.component';

@Component({
  selector: 'app-home', 
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoginComponent, 
  ],
  template: `
    <div class="home-container">
      <header class="home-header">
        <div>
          <h1 class="home-title">Family Management Hub</h1>
          <span class="home-subtitle">Dashboard</span>
        </div>

        <div class="home-auth-actions">
          <!-- If logged in: show sign out -->
          <button
            *ngIf="isLoggedIn$ | async; else showNothing"
            class="home-logout-btn"
            type="button"
            (click)="logout()"
          >
            Sign out
          </button>

          <!-- When logged out on home, we don't need an extra sign-in link
               because we’re about to show the login form below -->
          <ng-template #showNothing></ng-template>
        </div>
      </header>

      <!-- 👇 If logged in: show dashboard -->
      <ng-container *ngIf="isLoggedIn$ | async; else showLogin">
        <div class="cards-grid">
          <!-- Chores summary -->
          <section class="dashboard-card">
            <header class="card-header">
              <h2 class="card-title">Chores</h2>
              <a routerLink="/chores" class="view-all-link">
                View all
              </a>
            </header>

            <ng-container *ngIf="chores$ | async as chores; else choresLoading">
              <ng-container *ngIf="chores.length; else choresEmpty">
                <ul class="item-list">
                  <li *ngFor="let c of chores" class="item-row">
                    <span
                      class="status-dot"
                      [class.status-complete]="(c.completed?.length ?? 0) > 0"
                      [class.status-pending]="(c.completed?.length ?? 0) === 0"
                    ></span>

                    <a
                      [routerLink]="['/chores', c.id]"
                      class="item-link"
                    >
                      {{ c.title }}
                    </a>

                    <span class="item-pill">
                      {{ c.priority }}
                    </span>
                  </li>
                </ul>
              </ng-container>
            </ng-container>

            <ng-template #choresLoading>
              <p class="muted-text">Loading chores…</p>
            </ng-template>

            <ng-template #choresEmpty>
              <p class="muted-text">
                No chores yet. Start by adding one!
              </p>
              <a
                routerLink="/chores/new"
                class="primary-chip"
              >
                + New chore
              </a>
            </ng-template>
          </section>

          <!-- Recipes summary -->
          <section class="dashboard-card">
            <header class="card-header">
              <h2 class="card-title">Recipes</h2>
              <a routerLink="/recipes" class="view-all-link">
                View all
              </a>
            </header>

            <ng-container *ngIf="recipes$ | async as recipes; else recipesLoading">
              <ng-container *ngIf="recipes.length; else recipesEmpty">
                <ul class="item-list">
                  <li *ngFor="let r of recipes" class="item-row">
                    <a
                      [routerLink]="['/recipes', r.id]"
                      class="item-link"
                    >
                      {{ r.title }}
                    </a>
                  </li>
                </ul>
              </ng-container>
            </ng-container>

            <ng-template #recipesLoading>
              <p class="muted-text">Loading recipes…</p>
            </ng-template>

            <ng-template #recipesEmpty>
              <p class="muted-text">
                No recipes yet. Add your first one!
              </p>
              <a
                routerLink="/recipes/new"
                class="primary-chip"
              >
                + New recipe
              </a>
            </ng-template>
          </section>
        </div>
      </ng-container>

      <!-- 👇 If NOT logged in: show login form on the main page -->
      <ng-template #showLogin>
        <app-login></app-login>
      </ng-template>
    </div>
  `,
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private recipeSvc = inject(RecipeService);
  private choreSvc = inject(ChoreService);
  private auth = inject(AuthService);

  // show just a few on the dashboard
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