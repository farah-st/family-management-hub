import { Injectable } from '@angular/core';
import { Recipe } from '../models/recipe.model';

const KEY = 'fmh_recipes_v1';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private _recipes: Recipe[] = [];

  constructor() {
    this._recipes = this.load();
  }

  private load(): Recipe[] {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as Recipe[] : [];
  }
  private save() { localStorage.setItem(KEY, JSON.stringify(this._recipes)); }

  list(): Recipe[] { return [...this._recipes]; }
  get(id: string): Recipe | undefined { return this._recipes.find(r => r.id === id); }

  create(recipe: Recipe) {
    this._recipes = [recipe, ...this._recipes];
    this.save();
  }

  update(id: string, patch: Partial<Recipe>) {
    this._recipes = this._recipes.map(r => r.id === id ? { ...r, ...patch } : r);
    this.save();
  }

  remove(id: string) {
    this._recipes = this._recipes.filter(r => r.id !== id);
    this.save();
  }
}

