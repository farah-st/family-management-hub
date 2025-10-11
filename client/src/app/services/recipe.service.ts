import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Recipe } from '../models/recipe.model';

const KEY = 'fmh_recipes_v1';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private recipesSubject = new BehaviorSubject<Recipe[]>(this.load());
  public readonly recipes$: Observable<Recipe[]> = this.recipesSubject.asObservable();

  /** Return observable list */
  list(): Observable<Recipe[]> {
    return this.recipes$;
  }

  /** Get one recipe by ID */
  get(id: string): Recipe | undefined {
    return this.recipesSubject.getValue().find(r => r.id === id);
  }

  /** Create a new recipe and persist */
  create(recipe: Recipe) {
    const next = [recipe, ...this.recipesSubject.getValue()];
    this.recipesSubject.next(next);
    this.save(next);
  }

  /** Update existing recipe and persist */
  update(id: string, patch: Partial<Recipe>) {
    const next = this.recipesSubject.getValue().map(r =>
      r.id === id ? { ...r, ...patch } : r
    );
    this.recipesSubject.next(next);
    this.save(next);
  }

  /** ✅ Remove recipe and persist */
  remove(id: string) {
    const next = this.recipesSubject.getValue().filter(r => r.id !== id);
    this.recipesSubject.next(next);
    this.save(next);
  }

  /** Load from localStorage */
  private load(): Recipe[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Recipe[]) : [];
    } catch {
      return [];
    }
  }

  /** Save to localStorage */
  private save(recipes: Recipe[]) {
    localStorage.setItem(KEY, JSON.stringify(recipes));
  }
}
